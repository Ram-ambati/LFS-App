const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const fileService = {
  /**
   * Upload a file to the backend
   * @param {File} file - The file to upload
   * @returns {Promise<{token: string, fileName: string, fileSize: number}>}
   */
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/files/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Upload failed');
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
    const response = await fetch(`${API_BASE_URL}/files/download/${token}`);

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
