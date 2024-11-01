import { IoSearch } from 'react-icons/io5';
import { PiDotsThreeOutlineVerticalFill } from 'react-icons/pi';
import MessageArea from './MessageArea';
import { FaVideo } from "react-icons/fa";
import { MdCall } from "react-icons/md";
import { useRecoilState } from 'recoil';
import { accessedChat, onlineUsersState, userData } from '../../../atoms/state';
import ModalWrapper from '../../../common/ModalWrapper';
import { useContext, useEffect, useRef, useState } from 'react';
import GroupChat from '../components/smallComponets/Profiles/GroupChat';
import OneonOneChat from '../components/smallComponets/Profiles/OneonOneChat';
import { fetchChatMessages } from '../../../constants/apiCalls';
import Loader from '../../../common/Loader';
import { io } from 'socket.io-client';
import TypingLoader from './components/TypingLoader';
import { useChatContext } from '../../../Contexts/ChatProvider';
import { formatDate, formatTime, getSenderDetails, isSameDay } from './constants';
import { toast } from 'react-toastify';
import AddToGroup from '../components/smallComponets/Profiles/components/AddToGroup';
import GroupParticipantsSlider from './components/GroupParticipantsSlider';
// import wallpaper from '../../../../src/assets/chatbg.jpeg';
import { VideoCallContext } from '../../../Contexts/VideCallContext';
import { useSocket } from '../../../Contexts/SocketProvider';


const ChatArea = () => {
    // SOCKET HOOK
    const socket = useSocket();

    // RECOIL STATES
    const [currSelectedChat] = useRecoilState(accessedChat);
    const [currentUser] = useRecoilState(userData);
    const [onlineUsers, setOnlineUsers] = useRecoilState(onlineUsersState);

    // GENERAL STATES
    const [isModalOpen, setModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [currTypingUser, setCurrTypingUser] = useState(null);

    // REFERENCE STATES
    const messagesEndRef = useRef(null);
    // CHAT CONTEXT STATES
    const { notifications, setNotifications, setLatestMessage, messages, setMessages,setAllChats,allChats } = useChatContext();
    // VIDEO CALL CONTEXT STATES
    const { setInitCall } = useContext(VideoCallContext);

    useEffect(() => {
        if (!socket) return;

        socket.on("user online", (data) => {
            setOnlineUsers(data);
        });

        socket.on("user offline", (data) => {
            setOnlineUsers(data);
        });


        socket.on('typing', (data) => {
            setCurrTypingUser(data)
            setIsTyping(true);
        });
        socket.on('stop typing', (data) => {
            setIsTyping(false);
        });

    }, [setOnlineUsers, socket,currSelectedChat]);


    useEffect(() => {
        if (!socket || !currSelectedChat) return;

        setLoading(true);
        fetchChatMessages(currSelectedChat?._id)
            .then((res) => {
                setMessages(res.messages);
                socket.emit('join chat', currSelectedChat?._id);
                setNotifications((prev) => prev.filter((i) => i.chat._id !== currSelectedChat?._id));

            })
            .catch((err) => console.log(err))
            .finally(() => setLoading(false));

        return () => {
            socket.emit('leave chat', currSelectedChat?._id);
        };
    }, [currSelectedChat, socket]);


useEffect(() => {
    if (!socket) return;
    socket.on('messageReceived', ({newMessageReceived,chat}) => {

        if (!currSelectedChat || currSelectedChat?._id !== newMessageReceived.chat?._id) {
            if (!notifications?.includes(newMessageReceived?.chat?._id)) {
                setNotifications((prev) => [...prev, newMessageReceived]);
                setLatestMessage(newMessageReceived);
                setAllChats((prevChats) => {
                    const chatExists = prevChats.some((c) => c._id === chat._id);
                    return chatExists ? prevChats : [chat,...prevChats ];
                });
        
            }

        }
        else{
            setMessages((prev) => [...prev, newMessageReceived]);
      
        }

    });
    return () => {
        socket.off('messageReceived'); 
    };

}, [currSelectedChat,socket]);


    useEffect(() => {
        if (!isTyping)
            setCurrTypingUser(null)
    }, [isTyping]);


    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({});
    }, [messages, isTyping]);

    return (
        <div className='w-full h-full flex  flex-col ' >


            {!currSelectedChat ?
                (<div className='flex items-center min-h-full w-full justify-center'>
                    <div className='flex flex-col items-center'>
                        <img className='object-cover h-32 w-32 rounded-full'
                            src="https://assets.turbologo.ru/blog/ru/2022/04/15044031/156.png" alt="" />
                        <h2 className='text-sm mt-4 opacity-40 font-semibold'>START A CHAT</h2>
                    </div>
                </div>)
                :
                (<>

                    {/* PROFILE MODAL WRAPPER  */}

                    <ModalWrapper open={isModalOpen} setOpenModal={setModalOpen}>
                        {currSelectedChat?.isGroupChat ? <GroupChat setOpenModal={setModalOpen} data={currSelectedChat} /> : <OneonOneChat setOpenModal={setModalOpen} data={getSenderDetails(currentUser, currSelectedChat?.users)} />}
                    </ModalWrapper>


                    {/* header */}
                    <div className='sticky top-0 w-full h-14  items-center p-3 flex justify-between bg-stone-50 dark:bg-stone-800'>
                        <div onClick={() => setModalOpen(true)}
                            className='flex items-center gap-4 px-5 w-full  transition-all ease-in delay-75'>
                            <img src={currSelectedChat?.isGroupChat && currSelectedChat?.groupAvatar ||
                                getSenderDetails(currentUser, currSelectedChat?.users)?.avatar || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"}
                                className='w-10 h-10 bg-white dark:bg-stone-400 rounded-full cursor-pointer hover:opacity-90' alt="" />
                            <div className='flex w-full flex-col cursor-pointer hover:opacity-80'>
                                <p>{currSelectedChat?.isGroupChat && currSelectedChat?.chatName || getSenderDetails(currentUser, currSelectedChat?.users)?.fullName}</p>
                                {
                                    currSelectedChat?.isGroupChat &&
                                    <GroupParticipantsSlider />
                                }

                                <div className='text-xs flex items-center gap-1 text-green-500'>
                                    {isTyping && !currSelectedChat?.isGroupChat ? (

                                        "Typing..."
                                    )
                                        : (

                                            !currSelectedChat?.isGroupChat &&
                                            (onlineUsers.includes(getSenderDetails(currentUser, currSelectedChat?.users)?._id) ? (
                                                <>
                                                    <div className='w-2 h-2 rounded-full bg-green-500' />
                                                    Online
                                                </>
                                            ) : (
                                                <p className='text-blue-500'>Offline</p>
                                            ))
                                        )}
                                </div>


                            </div>
                        </div>

                        <div className='flex items-center gap-4 px-5'>
                            {
                                !currSelectedChat?.isGroupChat &&
                                <>
                                    <MdCall className='cursor-pointer hover:text-gray-500 text-blue-600 dark:text-gray-300 ' />
                                    <FaVideo onClick={() => {
                                        setInitCall(true)
                                    }} className='cursor-pointer hover:text-gray-500 text-blue-600 dark:text-gray-300 ' />

                                </>
                            }
                            <IoSearch className='cursor-pointer hover:text-gray-500 text-gray-600 dark:text-gray-300 ' />
                            <PiDotsThreeOutlineVerticalFill title='Options' className='text-xl cursor-pointer hover:text-gray-500 text-gray-600 dark:text-gray-300' />
                        </div>
                    </div>


                    {/* Chat Area Main */}

                    <div className='flex-grow relative overflow-y-scroll p-5 lg:p-10 '
                        style={{ scrollbarWidth: 'thin' }}>

                        <p className='dark:text-stone-400 text-gray-400 w-fit px-4 mb-4 py-[2px] mx-auto text-xs bg-slate-50 dark:bg-stone-700 rounded-full'>
                            All messages are end-to-end encrypted
                        </p>

                        {loading ? (
                            <div className='flex items-center justify-center'>
                                <Loader />
                            </div>
                        ) : (
                            <div className='w-full flex relative flex-col my-1 p-4'>
                                {messages && messages.map((message, index) => {
                                    const showDateSeparator = index === 0 || !isSameDay(message.createdAt, messages[index - 1].createdAt);

                                    return (
                                        <div key={message._id} className=''>
                                            {/* Date stamps separator */}
                                            {showDateSeparator && (
                                                <div className='w-full flex justify-center my-2 '>
                                                    <p className='text-xs text-gray-500  px-3 py-1 bg-gray-100 rounded-full'>
                                                        {formatDate(message?.createdAt)}
                                                    </p>
                                                </div>
                                            )}
                                            {/*  Chat message */}
                                            <div className={`w-full flex my-1 ${message.sender._id === currentUser?._id ? "justify-end" : "justify-start"}`}>
                                                <div className={`max-w-[75%] px-4 py-2 rounded-lg shadow-md ${message.sender._id === currentUser?._id ? "bg-gray-700 text-white" : "bg-blue-600 text-white"} `}>
                                                    <p className={`text-xs font-semibold ${message.sender._id === currentUser?._id ? "text-gray-300" : "text-blue-300"} mb-1`}>
                                                        {message.sender._id === currentUser?._id ? "You" : message.sender?.userName || message.sender?.fullName}
                                                    </p>
                                                    <p className="text-sm leading-relaxed">
                                                        {message.content}
                                                    </p>
                                                    <div className={`text-[10px] text-right ${message.sender._id === currentUser?._id ? "text-gray-300" : "text-blue-300"}`}>
                                                        {formatTime(message.createdAt)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {isTyping && getSenderDetails(currentUser, currSelectedChat?.users) &&
                                    <>
                                        <TypingLoader />
                                        {currTypingUser && currSelectedChat?.isGroupChat &&
                                            <p className='text-[10px] text-gray-200 bg-stone-700 px-2 w-fit py-1 font-semibold rounded-full'>{currTypingUser?.userName}</p>
                                        }
                                    </>
                                }
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>



                    <div className='sticky bottom-0 z-10'>
                        <MessageArea
                            setIsTyping={setIsTyping}
                            setMessages={setMessages} currSelectedChat={currSelectedChat} />
                    </div>
                </>)
            }
        </div >
    );
}

export default ChatArea;
