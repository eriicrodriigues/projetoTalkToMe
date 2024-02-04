'use client';
import { useState } from "react";
import Button from "./Button";
import CreateRoom from "./Create";
import { Input } from "./Input";
import JoinRoom from "./Join";

export function FormWrapper() {
    const [selectedRoom, setSelectedRoom] = useState<'join' | 'create'>('join');
    const handleSelectRoom = (room: 'join' | 'create') => {
        setSelectedRoom(room)
    }
    return (
        <div className="w-full">
        <div className="flex items-center text-center">
          <span className={`w-1/2 p-4 cursor-pointer ${selectedRoom === 'join' &&  'bg-secondary rounded-t-lg text-primary'}`} onClick={()=>handleSelectRoom('join')}>Ingressar</span>
          <span className={`w-1/2 p-4 cursor-pointer ${selectedRoom === 'create' &&  'bg-secondary rounded-t-lg text-primary'}`} onClick={()=>handleSelectRoom('create')}>Nova reunião</span>
        </div>
        <div className="bg-secondary rounded-b-lg space-y-8 p-10">
          <RoomSelector selectedRoom={selectedRoom} />
        </div>
      </div>
    );
}

const RoomSelector = ({selectedRoom}: {selectedRoom: 'join' | 'create'}) => {
    switch (selectedRoom) {
        case 'join':
            return <JoinRoom />;
        case 'create':
            return <CreateRoom />;
        default:
            return <JoinRoom />;
    }
};