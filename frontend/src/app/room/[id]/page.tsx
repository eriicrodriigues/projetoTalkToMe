"use client";
import Chat from "@/src/components/Chat";
import Footer from "@/src/components/Footer";
import Header from "@/src/components/Header";
import { SocketContext } from "@/src/contexts/SocketContext";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useRef, useState } from "react";
import { Stream } from "stream";
interface IAnswer {
  sender: string;
  description: RTCSessionDescriptionInit;
}

interface ICandidate {
  sender: string;
  candidate: RTCIceCandidate;
}

interface IDataStream {
  id: string;
  stream: MediaStream;
}

export default function Room({ params }: { params: { id: string } }) {
  const { socket } = useContext(SocketContext);
  const localStream = useRef<HTMLVideoElement | null>(null);
  const router = useRouter();
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const [remoteStreams, setRemoteStreams] = useState<IDataStream[]>([]);
  const [videoMediaStream, setVideoMediaStream] = useState<MediaStream | null>(
    null,
  );
  console.log("🚀 ~ Room ~ remoteStreams:", remoteStreams);

  useEffect(() => {
    socket?.on("connect", async () => {
      console.log("conectado");
      socket?.emit("subscribe", {
        roomId: params.id,
        socketId: socket.id,
      });
      await initLocalCamera();
    });

    socket?.on("new user", (data) => {
      console.log("Novo usuario tentando se conectar", data);
      createPeerConnection(data.socketId, false);
      socket.emit("newUserStart", {
        to: data.socketId,
        sender: socket.id,
      });
    });

    socket?.on("newUserStart", (data) => {
      console.log("Usuario conectado na sala", data);
      createPeerConnection(data.sender, true);
    });

    socket?.on("sdp", (data) => handleAnswer(data));

    socket?.on("ice candidates", (data) => handleIceCandidates(data));
  }, [socket]);

  const handleIceCandidates = async (data: ICandidate) => {
    const peerConnection = peerConnections.current[data.sender];
    if (data.candidate) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  };

  const handleAnswer = async (data: IAnswer) => {
    const peerConnection = peerConnections.current[data.sender];
    if (data.description.type === "offer") {
      await peerConnection.setRemoteDescription(data.description);

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      console.log("Criando uma resposta");

      socket?.emit("sdp", {
        to: data.sender,
        sender: socket?.id,
        description: peerConnection.localDescription,
      });
    } else if (data.description.type === "answer") {
      console.log("Ouvindo a oferta");
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.description),
      );
    }
  };

  const createPeerConnection = async (
    socketId: string,
    createOffer: boolean,
  ) => {
    const config = {
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    };

    const peer = new RTCPeerConnection(config);
    peerConnections.current[socketId] = peer;
    const peerConnection = peerConnections.current[socketId];

    if (videoMediaStream) {
      videoMediaStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, videoMediaStream);
      });
    } else {
      const video = await initRemoteCamera();
      video.getTracks().forEach((track) => {
        peerConnection.addTrack(track, video);
      });
    }

    if (createOffer === true) {
      const peerConnection = peerConnections.current[socketId];

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      console.log("Criando uma oferta");

      socket?.emit("sdp", {
        to: socketId,
        sender: socket?.id,
        description: peerConnection.localDescription,
      });
    }

    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];

      const dataStream: IDataStream = {
        id: socketId,
        stream: remoteStream,
      };

      setRemoteStreams((prevState: IDataStream[]) => {
        if (!prevState.some((stream) => stream.id === socketId)) {
          return [...prevState, dataStream];
        }
        return prevState;
      });
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit("ice candidates", {
          to: socketId,
          sender: socket?.id,
          candidate: event.candidate,
        });
      }
    };
    peerConnection.onsignalingstatechange = (event) => {
      switch (peerConnection.signalingState) {
        case "closed":
          setRemoteStreams((prevState) =>
            prevState.filter((stream) => stream.id !== socketId),
          );

          break;
      }
    };

    peerConnection.onconnectionstatechange = (event) => {
      switch (peerConnection.connectionState) {
        case "disconnected":
          setRemoteStreams((prevState) =>
            prevState.filter((stream) => stream.id !== socketId),
          );
        case "failed":
          setRemoteStreams((prevState) =>
            prevState.filter((stream) => stream.id !== socketId),
          );
        case "closed":
          setRemoteStreams((prevState) =>
            prevState.filter((stream) => stream.id !== socketId),
          );
          break;
      }
    };
  };

  const logout = () => {
    videoMediaStream?.getTracks().forEach((track) => {
      track.stop();
      Object.values(peerConnections.current).forEach((peerConnection) => {
        peerConnection.close();
      });
    });
    socket?.disconnect();
    router.push("/");
  };

  const initLocalCamera = async () => {
    const video = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: {
        noiseSuppression: true,
        echoCancellation: true,
      },
    });
    setVideoMediaStream(video);
    if (localStream.current) localStream.current.srcObject = video;
  };

  const initRemoteCamera = async () => {
    const video = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: {
        noiseSuppression: true,
        echoCancellation: true,
      },
    });
    return video;
  };

  return (
    <div className='h-screen'>
      <Header />
      <div className='flex h-[75%] '>
        <div className='md:w-[70%] w-full m-3'>
          <div className='grid md:grid-cols-2 grid-cols-1 gap-3'>
            <div className='bg-gray-950 w-full rounded-md h-full p-2 relative'>
              <video
                className='h-full w-full mirror-node'
                autoPlay
                ref={localStream}
              ></video>
              <span className='absolute bottom-3'>Alexia Kattah</span>
            </div>
            {remoteStreams.map((stream, index) => {
              return (
                <div
                  className='bg-gray-950 w-full rounded-md h-full p-2 relative'
                  key={index}
                >
                  <video
                    className='w-full h-full'
                    autoPlay
                    ref={(video) => {
                      if (video && video.srcObject !== stream.stream)
                        video.srcObject = stream.stream;
                    }}
                  />
                  <span className='absolute bottom-3'>Alexia Kattah</span>
                </div>
              );
            })}
          </div>
        </div>
        <Chat roomId={params.id} />
      </div>
      <Footer
        videoMediaStream={videoMediaStream!}
        peerConnections={peerConnections}
        localStream={localStream}
        logout={logout}
      />
    </div>
  );
}
