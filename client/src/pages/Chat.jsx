// src/pages/Chat.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getChatRooms,
  getChatMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
  addReaction,
  deleteChatMessage,
  uploadChatAttachment,
} from '../api/chat';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  MessageSquare,
  Megaphone,
  Users,
  Calendar,
  BookOpen,
  Send,
  Paperclip,
  Smile,
  X,
  Search,
  Check,
  CheckCheck,
  Reply,
  Copy,
  Trash2,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Info,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const ROOM_ICONS = {
  general: MessageSquare,
  announcements: Megaphone,
  family_discussion: Users,
  events: Calendar,
  genealogy_help: BookOpen,
};

const ROOM_COLORS = {
  general: 'from-emerald-500 to-teal-600 text-emerald-600 bg-emerald-50 border-emerald-200',
  announcements: 'from-amber-500 to-orange-600 text-amber-600 bg-amber-50 border-amber-200',
  family_discussion: 'from-blue-500 to-indigo-600 text-indigo-600 bg-indigo-50 border-indigo-200',
  events: 'from-purple-500 to-fuchsia-600 text-purple-600 bg-purple-50 border-purple-200',
  genealogy_help: 'from-sky-500 to-cyan-600 text-cyan-600 bg-cyan-50 border-cyan-200',
};

const POPULAR_EMOJIS = [
  '👍', '❤️', '😂', '🙏', '👏', '🎉',
  '🔥', '🙌', '💯', '😊', '😍', '🤝',
  '✨', '🌹', '💐', '🎂', '🚩', '💡',
];

export default function Chat() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { socket, isConnected, joinRoom, leaveRoom, on } = useSocket();
  const queryClient = useQueryClient();

  // State
  const [selectedRoom, setSelectedRoom] = useState('general');
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [roomFilter, setRoomFilter] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [lightboxImage, setLightboxImage] = useState(null);
  const [showRoomInfo, setShowRoomInfo] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  // Fetch Rooms
  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['chatRooms'],
    queryFn: getChatRooms,
  });

  // Fetch Messages for current room
  const { data: messagesData, refetch: refetchMessages, isFetching: messagesFetching } = useQuery({
    queryKey: ['chatMessages', selectedRoom],
    queryFn: () => getChatMessages(selectedRoom, { limit: 100 }),
    enabled: !!selectedRoom,
  });

  // Fetch Unread Counts
  const { data: unreadCounts = [] } = useQuery({
    queryKey: ['chatUnreadCounts'],
    queryFn: getUnreadCount,
  });
  const unreadByRoom = useMemo(() => {
    return Object.fromEntries(unreadCounts.map(({ room, unread }) => [room, unread]));
  }, [unreadCounts]);

  const rooms = roomsData?.rooms || [];
  const currentRoomObj = rooms.find((r) => r.id === selectedRoom) || {
    id: selectedRoom,
    name: selectedRoom ? selectedRoom.replace('_', ' ') : 'Chat Room',
    description: 'Community conversation channel',
  };

  // Sync loaded messages
  useEffect(() => {
    if (messagesData?.data) {
      setMessages(messagesData.data);
      if (selectedRoom) {
        markMessagesAsRead(selectedRoom)
          .then(() => queryClient.invalidateQueries({ queryKey: ['chatUnreadCounts'] }))
          .catch(() => {});
      }
    }
  }, [messagesData, selectedRoom, queryClient]);

  // Join Room & socket channel
  useEffect(() => {
    if (selectedRoom && isConnected) {
      joinRoom(selectedRoom);
      refetchMessages();
    }
    return () => {
      if (selectedRoom) leaveRoom(selectedRoom);
    };
  }, [selectedRoom, isConnected]);

  // Handle Socket Events (Messages, Reactions, Deletions, Typing)
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      const senderId = String(newMessage.sender?._id || newMessage.sender);
      const isMine = senderId === String(user?.id);

      if (!isMine && newMessage.room !== selectedRoom) {
        toast(`${newMessage.senderName}: ${newMessage.message.substring(0, 40)}`, {
          icon: '💬',
          duration: 3500,
        });
        queryClient.invalidateQueries({ queryKey: ['chatUnreadCounts'] });
      }

      if (newMessage.room === selectedRoom) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMessage._id)) return prev;
          return [...prev, newMessage];
        });

        if (!isMine) {
          markMessagesAsRead(selectedRoom)
            .then(() => queryClient.invalidateQueries({ queryKey: ['chatUnreadCounts'] }))
            .catch(() => {});
        }
      }
    };

    const handleReaction = ({ messageId, reactions, room }) => {
      if (room === selectedRoom) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === messageId ? { ...msg, reactions } : msg))
        );
      }
    };

    const handleDeleted = ({ messageId, room }) => {
      if (room === selectedRoom) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId
              ? { ...msg, isDeleted: true, message: 'This message was deleted', attachments: [] }
              : msg
          )
        );
      }
    };

    const handleTypingStatus = ({ room, userName, isTyping }) => {
      if (room === selectedRoom) {
        setTypingUsers((prev) => {
          const updated = { ...prev };
          if (isTyping) {
            updated[userName] = true;
          } else {
            delete updated[userName];
          }
          return updated;
        });
      }
    };

    on('chat:message', handleNewMessage);
    on('chat:reaction', handleReaction);
    on('chat:deleted', handleDeleted);
    on('typing:status', handleTypingStatus);

    return () => {
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:reaction', handleReaction);
      socket.off('chat:deleted', handleDeleted);
      socket.off('typing:status', handleTypingStatus);
    };
  }, [socket, selectedRoom, on, user?.id, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, attachments]);

  // Typing emitter helper
  const handleInputChange = (e) => {
    setMessageText(e.target.value);

    if (!socket || !selectedRoom) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing:start', { room: selectedRoom, userName: user?.name || 'Member' });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing:stop', { room: selectedRoom, userName: user?.name || 'Member' });
    }, 2000);
  };

  // Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: sendMessage,
    onSuccess: (newMessage) => {
      setMessages((prev) => (prev.some((m) => m._id === newMessage._id) ? prev : [...prev, newMessage]));
      setMessageText('');
      setReplyingTo(null);
      setAttachments([]);
      inputRef.current?.focus();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to send message');
    },
  });

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!messageText.trim() && attachments.length === 0) return;
    if (!selectedRoom || !isConnected) return;

    if (isTypingRef.current && socket) {
      isTypingRef.current = false;
      socket.emit('typing:stop', { room: selectedRoom, userName: user?.name || 'Member' });
    }

    sendMessageMutation.mutate({
      room: selectedRoom,
      message: messageText.trim(),
      replyTo: replyingTo
        ? {
            messageId: replyingTo._id,
            senderName: replyingTo.senderName,
            messageText: replyingTo.message.substring(0, 100),
          }
        : null,
      attachments,
    });
  };

  // Reaction Toggle
  const handleToggleReaction = async (messageId, emoji) => {
    try {
      const res = await addReaction(messageId, emoji);
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions: res.reactions } : m))
      );
    } catch {
      toast.error('Could not react to message');
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      await deleteChatMessage(messageId);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, isDeleted: true, message: 'This message was deleted', attachments: [] }
            : m
        )
      );
      toast.success('Message deleted');
    } catch {
      toast.error('Could not delete message');
    }
  };

  // Copy message text
  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Message copied to clipboard');
  };

  // Attachment upload
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploadingAttachment(true);
    try {
      const uploaded = await uploadChatAttachment(formData);
      setAttachments((prev) => [...prev, uploaded]);
      toast.success('File attached');
    } catch {
      toast.error('Failed to upload file');
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    if (!roomFilter.trim()) return rooms;
    return rooms.filter((r) =>
      r.name.toLowerCase().includes(roomFilter.toLowerCase()) ||
      r.description?.toLowerCase().includes(roomFilter.toLowerCase())
    );
  }, [rooms, roomFilter]);

  // Filtered messages
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    return messages.filter(
      (m) =>
        m.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.senderName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, searchQuery]);

  // Date grouped messages
  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDay = '';

    filteredMessages.forEach((msg) => {
      const date = new Date(msg.createdAt);
      let dayLabel = format(date, 'MMMM d, yyyy');
      if (isToday(date)) dayLabel = 'Today';
      else if (isYesterday(date)) dayLabel = 'Yesterday';

      if (dayLabel !== currentDay) {
        currentDay = dayLabel;
        groups.push({ type: 'day_divider', label: dayLabel, id: `divider-${msg._id}` });
      }
      groups.push({ type: 'message', data: msg, id: msg._id });
    });

    return groups;
  }, [filteredMessages]);

  const typingNames = Object.keys(typingUsers);

  return (
    <div className="space-y-4">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('chat') || 'Family Chat'}</h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isConnected
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {isConnected ? 'Live Connected' : 'Reconnecting...'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time interactive communication with family members & committee
          </p>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-[calc(100vh-210px)] min-h-[580px] flex overflow-hidden">
        {/* Left Column: Room Navigation */}
        <aside className="w-72 sm:w-80 border-r border-slate-200 flex flex-col bg-slate-50/50">
          {/* Room Search Header */}
          <div className="p-4 border-b border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Channels</span>
              <span className="text-xs text-slate-400 font-medium">{rooms.length} Rooms</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
                placeholder="Search rooms..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          {/* Rooms List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {roomsLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                <span className="text-xs">Loading rooms...</span>
              </div>
            ) : filteredRooms.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400">No rooms found</p>
            ) : (
              filteredRooms.map((room) => {
                const IconComponent = ROOM_ICONS[room.id] || MessageSquare;
                const isSelected = selectedRoom === room.id;
                const unread = unreadByRoom[room.id] || 0;
                const themeClass = ROOM_COLORS[room.id] || ROOM_COLORS.general;

                return (
                  <button
                    key={room.id}
                    onClick={() => {
                      setSelectedRoom(room.id);
                      setReplyingTo(null);
                      setShowSearch(false);
                      setSearchQuery('');
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all relative group flex items-start gap-3 ${
                      isSelected
                        ? 'bg-emerald-50/90 border border-emerald-300/80 shadow-xs'
                        : 'hover:bg-white hover:border-slate-200 border border-transparent text-slate-700'
                    }`}
                  >
                    {/* Active Accent Bar */}
                    {isSelected && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-600 rounded-r-full" />
                    )}

                    {/* Room Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition ${
                        isSelected
                          ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-transparent shadow-xs'
                          : `${themeClass} group-hover:scale-105`
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-sm font-semibold truncate ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                          {room.name}
                        </span>
                        {unread > 0 && (
                          <span className="shrink-0 bg-emerald-600 text-white text-[11px] font-bold rounded-full px-2 py-0.5 shadow-xs">
                            {unread}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {room.lastMessage?.text ? (
                          <>
                            <span className="font-medium text-slate-600">{room.lastMessage.sender}:</span>{' '}
                            {room.lastMessage.text}
                          </>
                        ) : (
                          room.description || 'Join conversation'
                        )}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* User Presence Footer */}
          <div className="p-3 border-t border-slate-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{user?.name || 'My Profile'}</p>
                <p className="text-[10px] text-slate-400 capitalize">{user?.role || 'Member'}</p>
              </div>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" title="Online" />
          </div>
        </aside>

        {/* Right Area: Chat Stream & Message Input */}
        <section className="flex-1 flex flex-col bg-slate-50/30 overflow-hidden">
          {/* Chat Window Header */}
          <header className="px-5 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shadow-2xs z-10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                {(() => {
                  const Icon = ROOM_ICONS[selectedRoom] || MessageSquare;
                  return <Icon className="w-5 h-5" />;
                })()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 truncate">#{currentRoomObj.name}</h2>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Channel
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate max-w-md">
                  {currentRoomObj.description || 'Welcome to this family room'}
                </p>
              </div>
            </div>

            {/* Header Controls */}
            <div className="flex items-center gap-1.5">
              {showSearch ? (
                <div className="relative flex items-center animate-fadeIn">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search in room..."
                    className="pl-8 pr-7 py-1 text-xs rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 w-40 sm:w-56"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowSearch(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSearch(true)}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                  title="Search messages"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => setShowRoomInfo(!showRoomInfo)}
                className={`p-2 rounded-lg transition ${
                  showRoomInfo ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
                title="Channel details"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Room Details Drawer Banner */}
          {showRoomInfo && (
            <div className="bg-emerald-50/80 border-b border-emerald-100 px-5 py-2.5 flex items-center justify-between text-xs text-emerald-900 animate-slideDown">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>About #{currentRoomObj.name}:</strong> {currentRoomObj.description}. Messages are encrypted & preserved in family archives.
                </span>
              </div>
              <button onClick={() => setShowRoomInfo(false)} className="text-emerald-700 hover:text-emerald-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Search Result Notification */}
          {searchQuery && (
            <div className="bg-amber-50 px-5 py-2 text-xs border-b border-amber-200 text-amber-800 flex items-center justify-between">
              <span>Showing results for &ldquo;{searchQuery}&rdquo; ({filteredMessages.length} matches)</span>
              <button onClick={() => setSearchQuery('')} className="underline text-amber-900 font-medium">Clear search</button>
            </div>
          )}

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
            {messagesFetching && messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <p className="text-sm">Fetching conversation...</p>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center mb-4 shadow-sm">
                  {(() => {
                    const Icon = ROOM_ICONS[selectedRoom] || MessageSquare;
                    return <Icon className="w-8 h-8" />;
                  })()}
                </div>
                <h3 className="text-base font-bold text-slate-800">Welcome to #{currentRoomObj.name}!</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  {currentRoomObj.description || 'Start the discussion by sharing an update or greeting.'}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {['नमस्कार 🙏', 'जय कुलदेवता! 🚩', 'शुभ प्रभात! ☀️'].map((greeting) => (
                    <button
                      key={greeting}
                      onClick={() => setMessageText(greeting)}
                      className="px-3 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-xs font-medium rounded-full border border-slate-200 hover:border-emerald-300 shadow-2xs transition"
                    >
                      {greeting}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              groupedMessages.map((item) => {
                if (item.type === 'day_divider') {
                  return (
                    <div key={item.id} className="flex items-center justify-center my-4">
                      <span className="bg-slate-200/80 text-slate-600 text-[11px] font-semibold px-3 py-1 rounded-full shadow-2xs">
                        {item.label}
                      </span>
                    </div>
                  );
                }

                const msg = item.data;
                const isMine = String(msg.sender?._id || msg.sender) === String(user?.id);
                const hasReactions = Array.isArray(msg.reactions) && msg.reactions.length > 0;
                const role = msg.senderRole || 'user';

                return (
                  <div
                    key={msg._id}
                    className={`flex items-end gap-2.5 group ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Incoming Avatar */}
                    {!isMine && (
                      <div
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs ring-2 ring-white"
                        title={msg.senderName}
                      >
                        {msg.senderName?.charAt(0)?.toUpperCase() || 'M'}
                      </div>
                    )}

                    <div className={`max-w-[85%] sm:max-w-[70%] space-y-1 relative ${isMine ? 'items-end' : 'items-start'}`}>
                      {/* Message Bubble Card */}
                      <div
                        className={`p-3.5 rounded-2xl relative shadow-xs transition-all ${
                          msg.isDeleted
                            ? 'bg-slate-100 text-slate-400 italic border border-slate-200'
                            : isMine
                            ? 'bg-gradient-to-br from-emerald-700 to-teal-800 text-white rounded-br-xs'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                        }`}
                      >
                        {/* Sender header for incoming */}
                        {!isMine && !msg.isDeleted && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-xs font-bold text-emerald-800">{msg.senderName}</span>
                            {role === 'admin' && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded">
                                Admin
                              </span>
                            )}
                            {role === 'staff' && (
                              <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-1.5 py-0.2 rounded">
                                Staff
                              </span>
                            )}
                          </div>
                        )}

                        {/* Quoted Reply Banner */}
                        {msg.replyTo && (
                          <div
                            className={`mb-2 p-2 rounded-lg text-xs border-l-2 ${
                              isMine
                                ? 'bg-emerald-800/60 border-emerald-300 text-emerald-100'
                                : 'bg-slate-50 border-emerald-600 text-slate-600'
                            }`}
                          >
                            <p className="font-semibold text-[11px] opacity-90">{msg.replyTo.senderName}</p>
                            <p className="truncate opacity-80">{msg.replyTo.messageText}</p>
                          </div>
                        )}

                        {/* Attachments */}
                        {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                          <div className="mb-2 space-y-1.5">
                            {msg.attachments.map((att, idx) => (
                              <div key={idx} className="overflow-hidden rounded-xl border border-black/10">
                                <img
                                  src={att.url}
                                  alt={att.name || 'Attachment'}
                                  onClick={() => setLightboxImage(att.url)}
                                  className="max-h-60 w-full object-cover cursor-pointer hover:opacity-95 transition"
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Message Text */}
                        <p className="text-sm whitespace-pre-wrap leading-relaxed break-words font-normal">
                          {msg.message}
                        </p>

                        {/* Metadata: Time and Delivery ticks */}
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-medium ${
                            isMine ? 'text-emerald-200' : 'text-slate-400'
                          }`}
                        >
                          <span>{format(new Date(msg.createdAt), 'h:mm a')}</span>
                          {isMine && !msg.isDeleted && (
                            <span>
                              {msg.readBy?.length > 0 ? (
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-300 inline" title="Read" />
                              ) : (
                                <Check className="w-3.5 h-3.5 opacity-80 inline" title="Sent" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Reactions Badge Display */}
                      {hasReactions && !msg.isDeleted && (
                        <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                          {Object.entries(
                            msg.reactions.reduce((acc, curr) => {
                              acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
                              return acc;
                            }, {})
                          ).map(([emoji, count]) => {
                            const userReacted = msg.reactions.some(
                              (r) => String(r.userId) === String(user?.id) && r.emoji === emoji
                            );
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(msg._id, emoji)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition ${
                                  userReacted
                                    ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <span>{emoji}</span>
                                <span className="font-semibold text-[11px]">{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Action Bar on Hover */}
                      {!msg.isDeleted && (
                        <div
                          className={`opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3.5 ${
                            isMine ? 'right-2' : 'left-2'
                          } flex items-center bg-white border border-slate-200 rounded-full shadow-md px-1 py-0.5 gap-0.5 z-20`}
                        >
                          {/* Quick Emoji Reaction Pill */}
                          <div className="flex items-center gap-0.5 pr-1 border-r border-slate-100">
                            {['👍', '❤️', '🙏', '🎉'].map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(msg._id, emoji)}
                                className="hover:scale-125 transition-transform p-1 text-xs"
                                title={`React ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>

                          {/* Reply Button */}
                          <button
                            onClick={() => {
                              setReplyingTo(msg);
                              inputRef.current?.focus();
                            }}
                            className="p-1 hover:bg-slate-100 text-slate-600 rounded-full transition"
                            title="Reply"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>

                          {/* Copy Button */}
                          <button
                            onClick={() => handleCopyMessage(msg.message)}
                            className="p-1 hover:bg-slate-100 text-slate-600 rounded-full transition"
                            title="Copy text"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button (Owner or Admin) */}
                          {(isMine || user?.role === 'admin') && (
                            <button
                              onClick={() => handleDeleteMessage(msg._id)}
                              className="p-1 hover:bg-red-50 text-red-500 rounded-full transition"
                              title="Delete message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing Indicator */}
            {typingNames.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-1 px-3 bg-white/80 rounded-full w-fit shadow-2xs border border-slate-200">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                </span>
                <span>{typingNames.join(', ')} is typing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input & Composer Area */}
          <footer className="p-3 sm:p-4 bg-white border-t border-slate-200 space-y-2">
            {/* Reply Preview Banner */}
            {replyingTo && (
              <div className="flex items-center justify-between px-3 py-2 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs animate-slideDown">
                <div className="flex items-center gap-2 min-w-0">
                  <Reply className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="text-slate-600 truncate">
                    Replying to <strong>{replyingTo.senderName}</strong>: &ldquo;{replyingTo.message.substring(0, 50)}...&rdquo;
                  </span>
                </div>
                <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Attachments Preview Banner */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 px-1">
                {attachments.map((att, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 w-16 h-16 bg-slate-100">
                    <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Composer Input Bar */}
            <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
              {/* Attachment Picker */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAttachment || !isConnected}
                className="p-2.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition disabled:opacity-50"
                title="Attach photo"
              >
                {uploadingAttachment ? (
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                ) : (
                  <Paperclip className="w-5 h-5" />
                )}
              </button>

              {/* Emoji Selector Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-2.5 rounded-xl transition ${
                    showEmojiPicker ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-100'
                  }`}
                  title="Emoji picker"
                >
                  <Smile className="w-5 h-5" />
                </button>

                {/* Emoji Dropdown Palette */}
                {showEmojiPicker && (
                  <div className="absolute bottom-12 left-0 z-30 p-2.5 bg-white rounded-2xl shadow-xl border border-slate-200 grid grid-cols-6 gap-1 w-64 animate-popIn">
                    {POPULAR_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setMessageText((prev) => prev + emoji);
                          setShowEmojiPicker(false);
                          inputRef.current?.focus();
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-lg text-center hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Text Input */}
              <input
                ref={inputRef}
                type="text"
                value={messageText}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Type a message in #${currentRoomObj.name}...`}
                className="flex-1 py-2.5 px-4 text-sm bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-emerald-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition placeholder:text-slate-400"
                disabled={!isConnected}
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={(!messageText.trim() && attachments.length === 0) || !isConnected || sendMessageMutation.isPending}
                className="p-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Send message"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
          </footer>
        </section>
      </div>

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white p-2">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 bg-black/70 text-white rounded-full p-2 hover:bg-black transition"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={lightboxImage} alt="Preview" className="max-h-[85vh] max-w-full object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
