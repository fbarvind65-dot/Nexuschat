import {
  addDoc,
  collection,
  doc,
  Firestore,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  Unsubscribe,
  where,
} from "firebase/firestore";

export type CallType = "audio" | "video";

export type IncomingCall = {
  id: string;
  callerId: string;
  calleeId: string;
  type: CallType;
  offer: RTCSessionDescriptionInit;
  status: string;
};

export type CallSession = {
  callId: string;
  localStream: MediaStream;
  peerConnection: RTCPeerConnection;
  endCall: () => Promise<void>;
};

type CallCallbacks = {
  onRemoteStream?: (stream: MediaStream) => void;
  onStatus?: (status: string) => void;
};

function createPeer(): RTCPeerConnection {
  return new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
    ],
  });
}

async function getMedia(type: CallType): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      "Camera/microphone unavailable. Open NexusChat over HTTPS."
    );
  }

  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video:
      type === "video"
        ? { facingMode: "user" }
        : false,
  });
}

function preparePeer(
  peer: RTCPeerConnection,
  stream: MediaStream,
  callbacks: CallCallbacks
) {
  stream.getTracks().forEach((track) => {
    peer.addTrack(track, stream);
  });

  peer.ontrack = (event) => {
    if (event.streams[0]) {
      callbacks.onRemoteStream?.(event.streams[0]);
    }
  };

  peer.onconnectionstatechange = () => {
    callbacks.onStatus?.(peer.connectionState);
  };
}

function makeSession(
  db: Firestore,
  callId: string,
  peer: RTCPeerConnection,
  stream: MediaStream,
  callbacks: CallCallbacks,
  unsubscribers: Unsubscribe[]
): CallSession {
  let ended = false;

  return {
    callId,
    localStream: stream,
    peerConnection: peer,

    endCall: async () => {
      if (ended) return;
      ended = true;

      unsubscribers.forEach((unsubscribe) => unsubscribe());

      peer.ontrack = null;
      peer.onicecandidate = null;
      peer.onconnectionstatechange = null;
      peer.close();

      stream.getTracks().forEach((track) => track.stop());

      try {
        await updateDoc(doc(db, "calls", callId), {
          status: "ended",
          endedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error("Could not update call status:", error);
      }

      callbacks.onStatus?.("ended");
    },
  };
}

export function watchIncomingCalls(
  db: Firestore,
  userId: string,
  onCalls: (calls: IncomingCall[]) => void
): Unsubscribe {
  const callsQuery = query(
    collection(db, "calls"),
    where("calleeId", "==", userId)
  );

  return onSnapshot(callsQuery, (snapshot) => {
    const calls = snapshot.docs
      .map((item) => ({
        id: item.id,
        ...item.data(),
      }))
      .filter(
        (call) =>
          call.status === "ringing" &&
          !!call.offer &&
          call.calleeId === userId
      ) as IncomingCall[];

    onCalls(calls);
  });
}

export async function startCall(
  db: Firestore,
  callerId: string,
  calleeId: string,
  type: CallType,
  callbacks: CallCallbacks = {}
): Promise<CallSession> {
  if (callerId === calleeId) {
    throw new Error("You cannot call your own account.");
  }

  const stream = await getMedia(type);
  const peer = createPeer();
  const callRef = doc(collection(db, "calls"));
  const unsubscribers: Unsubscribe[] = [];

  try {
    preparePeer(peer, stream, callbacks);

    await setDoc(callRef, {
      callerId,
      calleeId,
      type,
      status: "ringing",
      createdAt: serverTimestamp(),
    });

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        void addDoc(
          collection(callRef, "callerCandidates"),
          {
            candidate: event.candidate.toJSON(),
            createdAt: serverTimestamp(),
          }
        );
      }
    };

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    await updateDoc(callRef, {
      offer: {
        type: offer.type,
        sdp: offer.sdp,
      },
    });

    const session = makeSession(
      db,
      callRef.id,
      peer,
      stream,
      callbacks,
      unsubscribers
    );

    let settingAnswer = false;
    const pendingCandidates: RTCIceCandidateInit[] = [];

    unsubscribers.push(
      onSnapshot(callRef, async (snapshot) => {
        const data = snapshot.data();
        if (!data) return;

        if (
          data.answer &&
          !peer.remoteDescription &&
          !settingAnswer
        )
