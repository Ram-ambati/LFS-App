import { useNavigate } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar__container">
        <div className="navbar__brand" onClick={() => navigate('/')}>
          <div className="navbar__logo">LFS</div>
          <span className="navbar__title">Secure File Sharing</span>
        </div>
      </div>
    </nav>
  );
}
