import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:8000'); // Adjust the URL if your server is running elsewhere

const VideoApp = () => {
    const [myId, setMyId] = useState('');
    const [users, setUsers] = useState([]);
    const [connectedUser, setConnectedUser] = useState(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const peerConnectionRef = useRef(null);

    useEffect(() => {
        // Get user media
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                localVideoRef.current.srcObject = stream;
                localStreamRef.current = stream;

                socket.emit('join');

                socket.on('user:joined', id => {
                    setMyId(id);
                    console.log(`My ID: ${id}`);
                });

                socket.on('allUsers', users => {
                    setUsers(users.filter(user => user !== myId));
                    console.log(`All Users: ${users}`);
                });

                socket.on('user-connected', id => {
                    setUsers(prevUsers => [...prevUsers, id]);
                    console.log(`User Connected: ${id}`);
                    createPeerConnection(id); // Create peer connection for new user
                });

                socket.on('incoming:call', handleIncomingCall);
                socket.on('call:accepted', handleCallAccepted);
                socket.on('ice-candidate', handleIceCandidate);
            }).catch(error => {
                console.error('Error accessing media devices.', error);
            });

        socket.on('user-disconnected', id => {
            setUsers(prevUsers => prevUsers.filter(user => user !== id));
            console.log(`User Disconnected: ${id}`);
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
                peerConnectionRef.current = null;
                setConnectedUser(null);
                // delete peerConnectionRef.current[id];
                // delete remoteVideoRef.current[id]; // Remove remote video ref
            }
           
        });
    }, [myId]);

    const createPeerConnection = () => {
        const peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        peerConnection.onicecandidate = event => {
            debugger
            if (event.candidate) {
                console.log(`ICE Candidate: ${event.candidate}`);
                socket.emit('ice-candidate', { to: connectedUser, candidate: event.candidate });
            }
        };

        peerConnection.ontrack = event => {
            debugger
            console.log(`Track Event: ${event.streams}`);
            remoteVideoRef.current.srcObject = event.streams[0];
        };

        localStreamRef.current.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStreamRef.current);
        });

        return peerConnection;
    };

    const handleIncomingCall = async ({ from, offer }) => {
        console.log(`Incoming Call from: ${from}`);
        if (peerConnectionRef.current) {
            console.warn('PeerConnection already exists, closing it to handle new call');
            peerConnectionRef.current.close();
        }
        peerConnectionRef.current = createPeerConnection();
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);

        socket.emit('call:accepted', { to: from, answer });
        setConnectedUser(from); // Set the connected user
    };

    const handleCallAccepted = async ({ answer }) => {
        console.log(`Call Accepted with Answer: ${answer}`);
        if (!peerConnectionRef.current) {
            console.error('PeerConnection does not exist.');
            return;
        }

        if (peerConnectionRef.current.signalingState !== 'have-local-offer') {
            console.error('PeerConnection is not in the correct state to set remote answer.');
            return;
        }

        if (peerConnectionRef.current.remoteDescription) {
            console.warn('Remote description already set.');
            return;
        }

        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    };


    const handleIceCandidate = async ({ candidate }) => {
        console.log(`Handling ICE Candidate: ${candidate}`);
        if (peerConnectionRef.current) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
    };

    const callUser = async userId => {
        console.log(`Calling User: ${userId}`);
        if (peerConnectionRef.current) {
            console.warn('PeerConnection already exists, closing it to make new call');
            peerConnectionRef.current.close();
        }
        peerConnectionRef.current = createPeerConnection();
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);

        socket.emit('outgoing:call', { to: userId, fromOffer: offer });
        setConnectedUser(userId); // Set the connected user
    };

    console.log('localVideoRef', localVideoRef);
    console.log('remoteVideoRef', remoteVideoRef);
    return (
        <div>
            <h3>Your Id: <span>{myId}</span></h3>
            <h3>Online Users (click to connect)</h3>
            <div id="users">
                {[...new Set(users)].map(user => (
                    <div key={user}  onClick={() => callUser(user)}>
                        {user}
                    </div>
                ))}
            </div>
            <div className='d-flex'>
                <div>
                    <h3>Your Video</h3>
                    <video id='myvideo' ref={localVideoRef} autoPlay playsInline muted></video>
                </div>
                <div>
                    <h3>Remote Video</h3>
                    <video id='remote' ref={remoteVideoRef} autoPlay playsInline></video>
                </div>
            </div>
        </div>
    );
};

export default VideoApp;
