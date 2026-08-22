import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Register from './pages/Register';

function Header() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div>
          <div className="site-header__mark">KEMRI SACCO</div>
        </div>
        <div className="site-header__tag">Member Portal</div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Register />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
