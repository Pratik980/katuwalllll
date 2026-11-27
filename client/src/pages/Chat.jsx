import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getChatRooms,
  getChatMessages,
  sendMessage,
  editChatMessage,
  deleteChatMessage,
  createChatGroup,
  deleteChatGroup,
  markMessagesAsRead,
  getUnreadCount,
  addReaction,
  uploadChatAttachment,
  unsendChatMessage,
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
  Loader2,
  Pencil,
  Plus,
  ArrowLeft,
  Undo2,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import toast from 'react-hot-toast';

const ROOM_ICONS = {
  general: MessageSquare,
  announcements: Megaphone,
  family_discussion: Users,
  events: Calendar,
  genealogy_help: BookOpen,
};

const ROOM_LABEL_KEYS = {
  general: ['chat_room_general', 'chat_room_general_desc'],
  announcements: ['chat_room_announcements', 'chat_room_announcements_desc'],
  family_discussion: ['chat_room_family', 'chat_room_family_desc'],
  events: ['chat_room_events', 'chat_room_events_desc'],
  genealogy_help: ['chat_room_genealogy', 'chat_room_genealogy_desc'],
};

const POPULAR_EMOJIS = [
  '👍', '❤️', '😂', '🙏', '👏', '🎉',
  '🔥', '🙌', '💯', '😊', '😍', '🤝',
  '✨', '🌹', '💐', '🎂', '🚩', '💡',
];

const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_SIZE = 8 * 1024 * 1024;

const sameId = (left, right) => String(left || '') === String(right || '');
const trimString = (value) => (typeof value === 'string' ? value.trim() : '');

export default function Chat() {
  const { t, language } = useLanguage();
  const getRoleLabel = (role) => {
    const key = `role_${role}`;
    const label = t(key);
    return label === key ? role : label;
  };
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  const [selectedRoom, setSelectedRoom] = useState('general');
  const [mobileRoomsOpen, setMobileRoomsOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [roomFilter, setRoomFilter] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [lightboxImage, setLightboxImage] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['chatRooms'],
    queryFn: getChatRooms,
  });

  const { data: messagesData, isFetching: messagesFetching } = useQuery({
    queryKey: ['chatMessages', selectedRoom],
    queryFn: () => getChatMessages(selectedRoom, { limit: 100 }),
    enabled: Boolean(selectedRoom),
  });

  const { data: unreadCounts = [] } = useQuery({
    queryKey: ['chatUnreadCounts'],
    queryFn: getUnreadCount,
  });

  const unreadByRoom = useMemo(
    () => Object.fromEntries(unreadCounts.map(({ room, unread }) => [room, unread])),
    [unreadCounts]
  );

  const rooms = useMemo(() => roomsData?.rooms || [], [roomsData]);
  const messages = useMemo(() => messagesData?.data || [], [messagesData]);

  const updateRoomMessages = useCallback(
    (roomId, updater) => {
      queryClient.setQueryData(['chatMessages', roomId], (previous) => {
        if (!Array.isArray(previous?.data)) return previous;
        return { ...previous, data: updater(previous.data) };
      });
    },
    [queryClient]
  );

  const getRoomName = (room) => {
    if (!room) return t('chat');
    if (!room.isGroup && ROOM_LABEL_KEYS[room.id]) return t(ROOM_LABEL_KEYS[room.id][0]);
    return room.name || t('chat_custom_group');
  };

  const getRoomDescription = (room) => {
    if (!room) return '';
    if (!room.isGroup && ROOM_LABEL_KEYS[room.id]) return t(ROOM_LABEL_KEYS[room.id][1]);
    return room.description || t('chat_custom_group_desc');
  };

  const currentRoomObj = rooms.find((room) => room.id === selectedRoom) || {
    id: selectedRoom,
    name: selectedRoom,
    description: '',
    isGroup: false,
  };
  const currentRoomName = getRoomName(currentRoomObj);
  const CurrentRoomIcon = ROOM_ICONS[currentRoomObj.id] || Users;
  const isAdminGroup =
    currentRoomObj.isAdminGroup === true || currentRoomObj.ownerRole === 'admin';
  const canDeleteCurrentGroup =
    currentRoomObj.isGroup &&
    (user?.role === 'admin' || (!isAdminGroup && sameId(currentRoomObj.createdBy, user?.id)));

  useEffect(() => {
    if (!messagesData?.data || !selectedRoom) return;

    markMessagesAsRead(selectedRoom)
      .then(() => queryClient.invalidateQueries({ queryKey: ['chatUnreadCounts'] }))
      .catch(() => {});
  }, [messagesData, selectedRoom, queryClient]);

  useEffect(() => {
    if (!socket || !isConnected || !selectedRoom) return undefined;

    socket.emit('join', { room: selectedRoom });
    return () => socket.emit('leave', { room: selectedRoom });
  }, [socket, selectedRoom, isConnected]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleNewMessage = (newMessage) => {
      const isMine = sameId(newMessage.sender?._id || newMessage.sender, user?.id);
      const inCurrentRoom = newMessage.room === selectedRoom;

      if (!isMine && !inCurrentRoom) {
        toast(`${newMessage.senderName}: ${(newMessage.message || '').slice(0, 40)}`, {
          icon: '💬',
          duration: 3500,
        });
        queryClient.invalidateQueries({ queryKey: ['chatUnreadCounts'] });
      }

      if (!inCurrentRoom) return;

      updateRoomMessages(newMessage.room, (previous) => {
        if (previous.some((item) => item._id === newMessage._id)) return previous;
        return [...previous, newMessage];
      });

      if (!isMine) {
        markMessagesAsRead(selectedRoom)
          .then(() => queryClient.invalidateQueries({ queryKey: ['chatUnreadCounts'] }))
          .catch(() => {});
      }
    };

    const handleUpdated = (updatedMessage) => {
      if (updatedMessage.room !== selectedRoom) return;
      updateRoomMessages(updatedMessage.room, (previous) =>
        previous.map((item) => (item._id === updatedMessage._id ? updatedMessage : item))
      );
    };

    const handleReaction = ({ messageId, reactions, room }) => {
      if (room !== selectedRoom) return;
      updateRoomMessages(room, (previous) =>
        previous.map((item) => (item._id === messageId ? { ...item, reactions } : item))
      );
    };

    const handleDeleted = ({ messageId, room }) => {
      if (room !== selectedRoom) return;
      updateRoomMessages(room, (previous) => previous.filter((item) => item._id !== messageId));
    };

    const handleTypingStatus = ({ room, userName, isTyping }) => {
      if (room !== selectedRoom) return;
      setTypingUsers((previous) => {
        const updated = { ...previous };
        if (isTyping) updated[userName] = true;
        else delete updated[userName];
        return updated;
      });
    };

    const handleRoomCreated = () => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
    };

    const handleRoomDeleted = ({ roomId }) => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      queryClient.invalidateQueries({ queryKey: ['chatUnreadCounts'] });
      if (roomId === selectedRoom) {
        setSelectedRoom('general');
        setMobileRoomsOpen(false);
      }
    };

    socket.on('chat:message', handleNewMessage);
    socket.on('chat:updated', handleUpdated);
    socket.on('chat:reaction', handleReaction);
    socket.on('chat:deleted', handleDeleted);
    socket.on('typing:status', handleTypingStatus);
    socket.on('chat:room-created', handleRoomCreated);
    socket.on('chat:room-deleted', handleRoomDeleted);

    return () => {
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:updated', handleUpdated);
      socket.off('chat:reaction', handleReaction);
      socket.off('chat:deleted', handleDeleted);
      socket.off('typing:status', handleTypingStatus);
      socket.off('chat:room-created', handleRoomCreated);
      socket.off('chat:room-deleted', handleRoomDeleted);
    };
  }, [socket, selectedRoom, user?.id, queryClient, updateRoomMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, attachments]);

  useEffect(
    () => () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    },
    []
  );

  const resetComposer = () => {
    setMessageText('');
    setReplyingTo(null);
    setEditingMessage(null);
    setEditText('');
    setAttachments([]);
    setShowEmojiPicker(false);
  };

  const sendMessageMutation = useMutation({
    mutationFn: sendMessage,
    onSuccess: (newMessage, variables) => {
      updateRoomMessages(variables.room, (previous) =>
        previous.some((item) => item._id === newMessage._id) ? previous : [...previous, newMessage]
      );
      resetComposer();
      inputRef.current?.focus();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('chat_send_failed'));
    },
  });

  const editMessageMutation = useMutation({
    mutationFn: ({ messageId, message }) => editChatMessage(messageId, message),
    onSuccess: (updatedMessage) => {
      updateRoomMessages(updatedMessage.room, (previous) =>
        previous.map((item) => (item._id === updatedMessage._id ? updatedMessage : item))
      );
      setEditingMessage(null);
      setEditText('');
      toast.success(t('chat_message_edited'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('chat_edit_failed'));
    },
  });

  const unsendMessageMutation = useMutation({
    mutationFn: ({ messageId }) => unsendChatMessage(messageId),
    onSuccess: (updatedMessage, { messageId, room }) => {
      updateRoomMessages(room, (previous) =>
        previous.map((item) => {
          if (item._id !== messageId) return item;
          return updatedMessage?._id
            ? updatedMessage
            : { ...item, message: '', attachments: [], isDeleted: true, unsent: true };
        })
      );
      toast.success(t('chat_message_deleted'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('chat_delete_failed'));
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: createChatGroup,
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      setShowGroupModal(false);
      setGroupForm({ name: '', description: '' });
      resetComposer();
      setSearchQuery('');
      setShowSearch(false);
      if (room?.id) {
        setSelectedRoom(room.id);
        setMobileRoomsOpen(false);
      }
      toast.success(t('chat_group_created'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('chat_group_create_failed'));
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: deleteChatGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      queryClient.invalidateQueries({ queryKey: ['chatUnreadCounts'] });
      resetComposer();
      setSearchQuery('');
      setShowSearch(false);
      setSelectedRoom('general');
      setMobileRoomsOpen(false);
      toast.success(t('chat_group_deleted'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('chat_group_delete_failed'));
    },
  });

  const handleInputChange = (event) => {
    setMessageText(event.target.value);

    if (!socket || !isConnected || !selectedRoom) return;

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

  const handleSendMessage = (event) => {
    event?.preventDefault();
    const text = trimString(messageText);

    if (!text && attachments.length === 0) {
      toast.error(t('chat_message_required'));
      return;
    }
    if (!selectedRoom || sendMessageMutation.isPending) return;

    if (isTypingRef.current && socket) {
      isTypingRef.current = false;
      socket.emit('typing:stop', { room: selectedRoom, userName: user?.name || 'Member' });
    }

    sendMessageMutation.mutate({
      room: selectedRoom,
      message: text,
      replyTo: replyingTo
        ? {
            messageId: replyingTo._id,
            senderName: replyingTo.senderName,
            messageText: (replyingTo.message || '').slice(0, 100),
          }
        : null,
      attachments,
    });
  };

  const handleToggleReaction = async (messageId, emoji) => {
    try {
      const response = await addReaction(messageId, emoji);
      updateRoomMessages(selectedRoom, (previous) =>
        previous.map((item) =>
          item._id === messageId ? { ...item, reactions: response.reactions } : item
        )
      );
    } catch {
      toast.error(t('chat_react_failed'));
    }
  };

  const handleStartEdit = (message) => {
    setEditingMessage(message);
    setEditText(message.message);
    setReplyingTo(null);
  };

  const handleSaveEdit = (messageId) => {
    const text = trimString(editText);
    if (!text) {
      toast.error(t('chat_message_required'));
      return;
    }
    editMessageMutation.mutate({ messageId, message: text });
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm(t('chat_delete_confirm'))) return;

    try {
      await deleteChatMessage(messageId);
      updateRoomMessages(selectedRoom, (previous) =>
        previous.filter((item) => item._id !== messageId)
      );
      if (editingMessage?._id === messageId) {
        setEditingMessage(null);
        setEditText('');
      }
      toast.success(t('chat_message_deleted'));
    } catch (error) {
      toast.error(error.response?.data?.message || t('chat_delete_failed'));
    }
  };

  const handleUnsendMessage = (messageId) => {
    if (unsendMessageMutation.isPending) return;
    unsendMessageMutation.mutate({ messageId, room: selectedRoom });
  };

  const handleCopyMessage = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('chat_copied'));
    } catch {
      toast.error(t('chat_copy_failed'));
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (attachments.length >= MAX_ATTACHMENTS) {
      toast.error(t('chat_max_attachments', { count: MAX_ATTACHMENTS }));
      return;
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      const message = t('chat_image_too_large').replace(/(10|१०)\s*MB/gi, '8MB');
      toast.error(message);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploadingAttachment(true);
    try {
      const uploaded = await uploadChatAttachment(formData);
      setAttachments((previous) => [...previous, uploaded]);
      toast.success(t('chat_image_attached'));
    } catch (error) {
      toast.error(error.response?.data?.message || t('chat_attach_failed'));
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateGroup = (event) => {
    event.preventDefault();
    const name = trimString(groupForm.name);
    if (name.length < 2) {
      toast.error(t('chat_group_name_error'));
      return;
    }
    createGroupMutation.mutate({
      name,
      description: trimString(groupForm.description),
    });
  };

  const handleDeleteCurrentGroup = () => {
    if (!currentRoomObj.isGroup || !canDeleteCurrentGroup) return;
    if (!window.confirm(t('chat_confirm_delete_group'))) return;
    deleteGroupMutation.mutate(currentRoomObj.id);
  };

  const selectRoom = (roomId) => {
    if (roomId !== selectedRoom) {
      resetComposer();
      setSearchQuery('');
      setShowSearch(false);
    }
    setSelectedRoom(roomId);
    setMobileRoomsOpen(false);
  };

  const roomSearchQuery = roomFilter.trim().toLowerCase();
  const filteredRooms = roomSearchQuery
    ? rooms.filter(
        (room) =>
          getRoomName(room).toLowerCase().includes(roomSearchQuery) ||
          getRoomDescription(room).toLowerCase().includes(roomSearchQuery) ||
          room.name?.toLowerCase().includes(roomSearchQuery)
      )
    : rooms;

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const query = searchQuery.trim().toLowerCase();
    return messages.filter(
      (message) =>
        (message.message || '').toLowerCase().includes(query) ||
        (message.senderName || '').toLowerCase().includes(query)
    );
  }, [messages, searchQuery]);

  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDay = '';

    filteredMessages.forEach((message) => {
      const date = new Date(message.createdAt);
      let dayLabel;
      if (isToday(date)) dayLabel = t('chat_today');
      else if (isYesterday(date)) dayLabel = t('chat_yesterday');
      else {
        dayLabel = date.toLocaleDateString(language === 'ne' ? 'ne-NP' : 'en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }

      if (dayLabel !== currentDay) {
        currentDay = dayLabel;
        groups.push({ type: 'day_divider', label: dayLabel, id: `divider-${message._id}` });
      }
      groups.push({ type: 'message', data: message, id: message._id });
    });

    return groups;
  }, [filteredMessages, language, t]);

  const typingNames = Object.keys(typingUsers);

  return (
    <div className="flex h-[calc(100dvh-17rem)] min-h-0 flex-col gap-3 overflow-hidden md:h-[calc(100dvh-15.5rem)] md:gap-4">
      <div className="hidden shrink-0 items-center justify-between gap-3 md:flex">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('chat')}</h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                isConnected
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-slate-100 text-slate-600'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isConnected ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
              {isConnected ? t('chat_live') : t('chat_offline')}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{t('chat_subtitle')}</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <aside
          className={`${
            mobileRoomsOpen ? 'flex' : 'hidden'
          } min-h-0 w-full flex-col border-slate-200 bg-slate-50/60 md:flex md:w-72 md:shrink-0 md:border-r`}
        >
          <div className="space-y-3 border-b border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('chat_channels')}
                </p>
                <p className="text-xs text-slate-400">
                  {rooms.length} {t('chat_rooms')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGroupModal(true)}
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-800 px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                title={t('chat_new_group')}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('chat_new_group')}</span>
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={roomFilter}
                onChange={(event) => setRoomFilter(event.target.value)}
                placeholder={t('chat_search_rooms')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
            {roomsLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                <span className="text-xs">{t('chat_loading_rooms')}</span>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="px-3 py-10 text-center">
                <MessageSquare className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-600">{t('chat_no_rooms')}</p>
                <p className="mt-1 text-xs text-slate-400">{t('chat_no_rooms_hint')}</p>
              </div>
            ) : (
              filteredRooms.map((room) => {
                const Icon = ROOM_ICONS[room.id] || Users;
                const isSelected = selectedRoom === room.id;
                const unread = unreadByRoom[room.id] || 0;
                const roomName = getRoomName(room);

                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => selectRoom(room.id)}
                    className={`group relative flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? 'border-emerald-200 bg-emerald-50 text-slate-900'
                        : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-white'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-emerald-700" />
                    )}
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        isSelected
                          ? 'bg-emerald-800 text-white'
                          : 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{roomName}</span>
                        {room.lastMessage?.time && (
                          <span className="shrink-0 text-[10px] font-medium text-slate-400">
                            {format(new Date(room.lastMessage.time), 'h:mm a')}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-slate-500">
                          {room.lastMessage
                            ? `${room.lastMessage.sender}: ${room.lastMessage.text || ''}`
                            : getRoomDescription(room)}
                        </span>
                        {unread > 0 && (
                          <span className="shrink-0 rounded-full bg-emerald-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section
          className={`${
            mobileRoomsOpen ? 'hidden' : 'flex'
          } min-h-0 min-w-0 flex-1 flex-col md:flex`}
        >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileRoomsOpen(true)}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 md:hidden"
                title={t('chat_channels')}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <CurrentRoomIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-sm font-bold text-slate-900 sm:text-base">
                    {currentRoomName}
                  </h2>
                  {currentRoomObj.isGroup && (
                    <span className="hidden shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 sm:inline">
                      {t('chat_group')}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-slate-500">
                  {getRoomDescription(currentRoomObj)}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setShowSearch((value) => !value)}
                className={`rounded-xl p-2 transition ${
                  showSearch
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
                title={t('chat_search_messages')}
              >
                <Search className="h-4 w-4" />
              </button>
              {canDeleteCurrentGroup && (
                <button
                  type="button"
                  onClick={handleDeleteCurrentGroup}
                  disabled={deleteGroupMutation.isPending}
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
                  title={t('chat_delete_group')}
                >
                  {deleteGroupMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </header>

          {showSearch && (
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 sm:px-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t('chat_search_messages_placeholder')}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    title={t('close')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/40 px-3 py-4 sm:px-5">
            {messagesFetching && messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
                <span className="text-sm">{t('chat_loading_messages')}</span>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <MessageSquare className="h-7 w-7" />
                </span>
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  {searchQuery ? t('chat_no_search_results') : t('chat_no_messages')}
                </p>
                <p className="mt-1 max-w-xs text-xs text-slate-500">
                  {searchQuery ? t('chat_no_search_results_hint') : t('chat_no_messages_hint')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {groupedMessages.map((entry) => {
                  if (entry.type === 'day_divider') {
                    return (
                      <div key={entry.id} className="flex items-center gap-3 py-2">
                        <span className="h-px flex-1 bg-slate-200" />
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">
                          {entry.label}
                        </span>
                        <span className="h-px flex-1 bg-slate-200" />
                      </div>
                    );
                  }

                  const message = entry.data;
                  const isMine = sameId(message.sender?._id || message.sender, user?.id);
                  const reactions = message.reactions || [];
                  const hasReactions = reactions.length > 0;
                  const isEditing = editingMessage?._id === message._id;

                  return (
                    <div
                      key={message._id}
                      className={`group flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[88%] sm:max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
                        {!isMine && (
                          <div className="mb-1 flex items-center gap-2 px-1">
                            <span className="text-xs font-semibold text-slate-700">
                              {message.senderName}
                            </span>
                            {message.senderRole && message.senderRole !== 'user' && (
                              <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-700">
                                {getRoleLabel(message.senderRole)}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="relative">
                          <div
                            className={`rounded-2xl border px-3.5 py-2.5 shadow-sm ${
                              isMine
                                ? 'rounded-br-md border-emerald-800 bg-emerald-800 text-white'
                                : 'rounded-bl-md border-slate-200 bg-white text-slate-800'
                            } ${message.isDeleted ? 'italic opacity-70' : ''}`}
                          >
                            {message.replyTo?.messageText && !message.isDeleted && (
                              <div
                                className={`mb-2 rounded-lg border-l-2 px-2 py-1 text-xs ${
                                  isMine
                                    ? 'border-emerald-300 bg-emerald-700/60 text-emerald-50'
                                    : 'border-emerald-500 bg-emerald-50 text-slate-600'
                                }`}
                              >
                                <p className="font-semibold">{message.replyTo.senderName}</p>
                                <p className="truncate">{message.replyTo.messageText}</p>
                              </div>
                            )}

                            {isEditing ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editText}
                                  onChange={(event) => setEditText(event.target.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Escape') {
                                      setEditingMessage(null);
                                      setEditText('');
                                    }
                                  }}
                                  rows={3}
                                  maxLength={2000}
                                  className={`w-full resize-none rounded-lg p-2 text-sm outline-none ${
                                    isMine
                                      ? 'bg-white/15 text-white placeholder:text-emerald-200'
                                      : 'bg-slate-50 text-slate-800'
                                  }`}
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMessage(null);
                                      setEditText('');
                                    }}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                                      isMine
                                        ? 'bg-emerald-700 text-emerald-50 hover:bg-emerald-600'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                  >
                                    {t('cancel')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(message._id)}
                                    disabled={editMessageMutation.isPending || !editText.trim()}
                                    className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                                  >
                                    {editMessageMutation.isPending ? t('saving') : t('save')}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {message.attachments?.length > 0 && (
                                  <div className={`grid gap-2 ${message.attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                    {message.attachments.map((attachment, index) => (
                                      <button
                                        type="button"
                                        key={`${message._id}-${index}`}
                                        onClick={() => setLightboxImage(attachment.url)}
                                        className="overflow-hidden rounded-xl border border-black/5 bg-slate-100"
                                      >
                                        <img
                                          src={attachment.url}
                                          alt={attachment.name || t('chat_image_preview')}
                                          className="max-h-60 w-full object-cover transition hover:opacity-95"
                                        />
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {message.message && (
                                  <p
                                    className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${
                                      message.attachments?.length > 0 ? 'mt-2' : ''
                                    }`}
                                  >
                                    {message.isDeleted ? t('chat_deleted_message') : message.message}
                                  </p>
                                )}
                              </>
                            )}

                            <div
                              className={`mt-1 flex items-center justify-end gap-1 text-[10px] font-medium ${
                                isMine ? 'text-emerald-200' : 'text-slate-400'
                              }`}
                            >
                              {message.editedAt && !message.isDeleted && (
                                <span>{t('chat_edited')}</span>
                              )}
                              <span>{format(new Date(message.createdAt), 'h:mm a')}</span>
                              {isMine && !message.isDeleted && (
                                <span>
                                  {message.readBy?.length > 0 ? (
                                    <CheckCheck className="inline h-3.5 w-3.5" title={t('chat_read')} />
                                  ) : (
                                    <Check className="inline h-3.5 w-3.5 opacity-80" title={t('chat_sent')} />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>

                          {hasReactions && !message.isDeleted && (
                            <div className={`mt-1 flex flex-wrap gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                              {Object.entries(
                                reactions.reduce((accumulator, reaction) => {
                                  accumulator[reaction.emoji] = (accumulator[reaction.emoji] || 0) + 1;
                                  return accumulator;
                                }, {})
                              ).map(([emoji, count]) => {
                                const userReacted = reactions.some(
                                  (reaction) => sameId(reaction.userId, user?.id) && reaction.emoji === emoji
                                );
                                return (
                                  <button
                                    type="button"
                                    key={emoji}
                                    onClick={() => handleToggleReaction(message._id, emoji)}
                                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${
                                      userReacted
                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span>{emoji}</span>
                                    <span className="text-[11px] font-semibold">{count}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {!message.isDeleted && !isEditing && (
                            <div
                              className={`absolute -top-4 z-20 flex items-center gap-0.5 rounded-full border border-slate-200 bg-white px-1 py-0.5 shadow-md transition-opacity md:opacity-0 md:group-hover:opacity-100 ${
                                isMine ? 'right-2' : 'left-2'
                              }`}
                            >
                              <div className="flex items-center gap-0.5 border-r border-slate-100 pr-1">
                                {['👍', '❤️', '🙏', '🎉'].map((emoji) => (
                                  <button
                                    type="button"
                                    key={emoji}
                                    onClick={() => handleToggleReaction(message._id, emoji)}
                                    className="p-1 text-xs transition-transform hover:scale-125"
                                    title={t('chat_react')}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingTo(message);
                                  inputRef.current?.focus();
                                }}
                                className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                                title={t('chat_reply')}
                              >
                                <Reply className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(message.message)}
                                className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                                title={t('chat_copy')}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              {isMine && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleUnsendMessage(message._id)}
                                    disabled={unsendMessageMutation.isPending}
                                    className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
                                    title={t('unsend_message')}
                                    aria-label={t('unsend_message')}
                                  >
                                    <Undo2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(message)}
                                    className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                                    title={t('edit')}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMessage(message._id)}
                                    className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                                    title={t('delete')}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {typingNames.length > 0 && (
                  <div className="flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 shadow-sm">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:0.2s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:0.4s]" />
                    </span>
                    <span>{typingNames.join(', ')} {t('chat_typing')}</span>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <footer className="shrink-0 space-y-2 border-t border-slate-200 bg-white p-3 sm:p-4">
            {replyingTo && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs">
                <div className="flex min-w-0 items-center gap-2">
                  <Reply className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                  <span className="truncate text-slate-600">
                    {t('chat_replying_to')} <strong>{replyingTo.senderName}</strong>: &ldquo;
                    {(replyingTo.message || '').slice(0, 60)}&rdquo;
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-emerald-100 hover:text-slate-700"
                  title={t('close')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((attachment, index) => (
                  <div
                    key={`${attachment.url}-${index}`}
                    className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                  >
                    <img
                      src={attachment.url}
                      alt={attachment.name || t('chat_image_preview')}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((previous) => previous.filter((_, itemIndex) => itemIndex !== index))
                      }
                      className="absolute right-1 top-1 rounded-full bg-slate-900/60 p-0.5 text-white hover:bg-slate-900/80"
                      title={t('chat_remove_attachment')}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAttachment}
                className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-emerald-700 disabled:opacity-50"
                title={t('chat_attach_image')}
              >
                {uploadingAttachment ? (
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                ) : (
                  <Paperclip className="h-5 w-5" />
                )}
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((value) => !value)}
                  className={`rounded-xl p-2.5 transition ${
                    showEmojiPicker
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-emerald-700'
                  }`}
                  title={t('chat_emoji')}
                >
                  <Smile className="h-5 w-5" />
                </button>

                {showEmojiPicker && (
                  <div className="absolute bottom-12 left-0 z-30 grid w-64 grid-cols-6 gap-1 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl">
                    {POPULAR_EMOJIS.map((emoji) => (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => {
                          setMessageText((previous) => previous + emoji);
                          setShowEmojiPicker(false);
                          inputRef.current?.focus();
                        }}
                        className="rounded-lg p-1.5 text-center text-lg transition-transform hover:scale-125 hover:bg-slate-100"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                ref={inputRef}
                type="text"
                value={messageText}
                onChange={handleInputChange}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSendMessage();
                  }
                }}
                maxLength={2000}
                placeholder={t('chat_message_placeholder')}
                className="min-w-0 flex-1 rounded-xl border border-transparent bg-slate-100/80 px-4 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:bg-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />

              <button
                type="submit"
                disabled={
                  (!messageText.trim() && attachments.length === 0) || sendMessageMutation.isPending
                }
                className="rounded-xl bg-emerald-800 p-2.5 text-white transition hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                title={t('chat_send')}
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </form>
          </footer>
        </section>
      </div>

      {showGroupModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowGroupModal(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{t('chat_create_group')}</h3>
                <p className="mt-1 text-sm text-slate-500">{t('chat_create_group_hint')}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowGroupModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title={t('close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="chat-group-name">
                  {t('chat_group_name')}
                </label>
                <input
                  id="chat-group-name"
                  type="text"
                  value={groupForm.name}
                  onChange={(event) =>
                    setGroupForm((previous) => ({ ...previous, name: event.target.value }))
                  }
                  maxLength={80}
                  placeholder={t('chat_group_name_placeholder')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-sm font-medium text-slate-700"
                  htmlFor="chat-group-description"
                >
                  {t('chat_group_description')}{' '}
                  <span className="font-normal text-slate-400">({t('optional')})</span>
                </label>
                <textarea
                  id="chat-group-description"
                  value={groupForm.description}
                  onChange={(event) =>
                    setGroupForm((previous) => ({ ...previous, description: event.target.value }))
                  }
                  maxLength={300}
                  rows={3}
                  placeholder={t('chat_group_description_placeholder')}
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGroupModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={createGroupMutation.isPending || groupForm.name.trim().length < 2}
                  className="rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createGroupMutation.isPending ? t('creating') : t('chat_create_group')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
        >
          <div className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-white p-2">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute right-4 top-4 rounded-full bg-slate-900/70 p-2 text-white transition hover:bg-slate-900"
              title={t('close')}
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={lightboxImage}
              alt={t('chat_image_preview')}
              className="max-h-[85vh] max-w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
