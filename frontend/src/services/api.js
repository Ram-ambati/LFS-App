const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const getGuestId = () => {
  try {
    return localStorage.getItem('lfs_guest_id');
  } catch (e) {
    return null;
  }
};

export const fileService = {
  /**
   * Upload a file to the backend
   * @param {File} file - The file to upload
   * @returns {Promise<{token: string, fileName: string, fileSize: number}>}
   */
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const guestId = getGuestId();
    const url = guestId
      ? `${API_BASE_URL}/files/upload?guestToken=${encodeURIComponent(guestId)}`
      : `${API_BASE_URL}/files/upload`;

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorObj = new Error(data.error || data.message || 'Upload failed');
      errorObj.status = response.status;
      throw errorObj;
    }

    return data;
  },

  /**
   * Get file information by token
   * @param {string} token - The share token
   * @returns {Promise<{fileName: string, fileSize: number, uploadedAt: string}>}
   */
  async getFileInfo(token) {
    const response = await fetch(`${API_BASE_URL}/files/info/${token}`);

    if (!response.ok) {
      throw new Error(`File not found: ${response.statusText}`);
    }

    return await response.json();
  },

  /**
   * Download a file by token
   * @param {string} token - The share token
   * @returns {Promise<Blob>}
   */
  async downloadFile(token) {
    const guestId = getGuestId();
    const url = guestId
      ? `${API_BASE_URL}/files/download/${token}?guestToken=${encodeURIComponent(guestId)}`
      : `${API_BASE_URL}/files/download/${token}`;

    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    return await response.blob();
  },
};

/**
 * Helper function to trigger file download
 * @param {Blob} blob - The file blob
 * @param {string} fileName - The name to save the file as
 */
export const downloadBlob = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
