import { useState } from 'react'
import { uploadFile } from '../services/api'

function UploadCard() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [result, setResult] = useState(null)

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Please choose a file before uploading.')
      return
    }

    setIsUploading(true)
    setErrorMessage('')
    setResult(null)

    try {
      const response = await uploadFile(selectedFile)
      setResult(response)
    } catch (error) {
      setErrorMessage(error.message || 'Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <section className="upload-card" aria-live="polite">
      <p className="eyebrow">Local upload foundation</p>
      <h1>Secure File Sharing</h1>
      <p className="subtitle">
        Upload a file to the existing Spring Boot backend and receive a share token.
      </p>

      <label className="file-input-label" htmlFor="file-input">
        <span className="label-text">Choose File</span>
        <input
          id="file-input"
          type="file"
          onChange={(event) => {
            setSelectedFile(event.target.files?.[0] || null)
            setErrorMessage('')
          }}
        />
      </label>

      {selectedFile ? (
        <p className="selected-file">Selected: {selectedFile.name}</p>
      ) : (
        <p className="selected-file muted">No file selected yet.</p>
      )}

      <button
        type="button"
        className="upload-button"
        onClick={handleUpload}
        disabled={isUploading || !selectedFile}
      >
        {isUploading ? 'Uploading…' : 'Upload File'}
      </button>

      {isUploading && <p className="status">Uploading your file to the backend…</p>}
      {errorMessage && <p className="status error">{errorMessage}</p>}

      {result && (
        <article className="result-box">
          <h2>Upload successful</h2>
          <p className="success-message">Your file was stored through the backend.</p>
          <ul>
            <li><strong>Share token:</strong> {result.shareToken}</li>
            <li><strong>Original file name:</strong> {result.originalFileName}</li>
            <li><strong>File size:</strong> {result.fileSize} bytes</li>
          </ul>
        </article>
      )}
    </section>
  )
}

export default UploadCard
