// src/api/chat.js
import axios from './axios';

export const getChatRooms = async () => {
  const { data } = await axios.get('/chat/rooms');
  return data;
};

export const getChatMessages = async (room, params = {}) => {
  const { data } = await axios.get(`/chat/rooms/${room}/messages`, { params });
  return data;
};

export const sendMessage = async (messageData) => {
  const { data } = await axios.post('/chat/messages', messageData);
  return data;
};

export const addReaction = async (messageId, emoji) => {
  const { data } = await axios.put(`/chat/messages/${messageId}/react`, { emoji });
  return data;
};

export const editChatMessage = async (messageId, message) => {
  const { data } = await axios.put(`/chat/messages/${messageId}`, { message });
  return data;
};

export const deleteChatMessage = async (messageId) => {
  const { data } = await axios.delete(`/chat/messages/${messageId}`);
  return data;
};

export const unsendChatMessage = async (messageId) => {
  const { data } = await axios.put(`/chat/messages/${messageId}/unsend`);
  return data;
};

export const createChatGroup = async (groupData) => {
  const { data } = await axios.post('/chat/rooms', groupData);
  return data.room;
};

export const deleteChatGroup = async (roomId) => {
  const { data } = await axios.delete(`/chat/rooms/${roomId}`);
  return data;
};

export const uploadChatAttachment = async (formData) => {
  const { data } = await axios.post('/chat/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const markMessagesAsRead = async (room) => {
  const { data } = await axios.put(`/chat/rooms/${room}/read`);
  return data;
};

export const getUnreadCount = async () => {
  const { data } = await axios.get('/chat/unread');
  return data;
};
