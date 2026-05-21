import api from './index.js';

export const getStories = async () => {
  const response = await api.get('/stories');
  return response.data;
};

export const getLibrary = async () => {
  const response = await api.get('/stories/my/library');
  return response.data;
};

export const getStory = async (id) => {
  const response = await api.get(`/stories/${id}`);
  return response.data;
};

export const getPipelineStatus = async (id) => {
  const response = await api.get(`/stories/${id}/status`);
  return response.data;
};

export const uploadStory = async (data) => {
  // If data is FormData, headers should let axios handle boundary
  const headers = data instanceof FormData 
    ? { 'Content-Type': 'multipart/form-data' }
    : { 'Content-Type': 'application/json' };
    
  const response = await api.post('/stories/upload', data, { headers });
  return response.data;
};

export const likeStory = async (id) => {
  const response = await api.put(`/stories/${id}/like`);
  return response.data;
};

export const bookmarkStory = async (id, progress) => {
  const response = await api.put(`/stories/${id}/bookmark`, { progress });
  return response.data;
};

export const removeBookmark = async (id) => {
  const response = await api.put(`/stories/${id}/bookmark`, { remove: true });
  return response.data;
};

export const checkUserStoryStatus = async (id) => {
  const response = await api.get(`/stories/${id}/bookmarked`);
  return response.data;
};

export const getTTS = async (text, voiceModel) => {
  const response = await api.post('/stories/tts', { text, voice_model: voiceModel });
  return response.data;
};
