import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../services/api';

export default function Navbar() {
  const [backendStatus, setBackendStatus] = useState('checking'); // 'online' | 'offline' | 'checking'

  useEffect(() => {
    let mounted = true;
    api.getHealth()
      .then(() => {
        if (mounted) setBackendStatus('online');
      })
      .catch(() => {
        if (mounted) setBackendStatus('offline');
      });

    const interval = setInterval(() => {
      api.getHealth()
        .then(() => {
          if (mounted) setBackendStatus('online');
        })
        .catch(() => {
          if (mounted) setBackendStatus('offline');
        });
    }, 15000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="brand">
          <div className="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 2h-3a4 4 0 0 0-4 4v14a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2V6a4 4 0 0 0-4-4z"></path>
              <line x1="6" y1="2" x2="6" y2="22"></line>
              <line x1="4" y1="6" x2="8" y2="6"></line>
            </svg>
          </div>
          <span>GourmetReserve</span>
        </NavLink>

        <nav>
          <ul className="nav-links">
            <li>
              <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Panel
              </NavLink>
            </li>
            <li>
              <NavLink to="/reservas" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Reservas
              </NavLink>
            </li>
            <li>
              <NavLink to="/mesas" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Mesas
              </NavLink>
            </li>
            <li>
              <NavLink to="/clientes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Clientes
              </NavLink>
            </li>
            <li>
              <NavLink to="/horarios" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Horarios
              </NavLink>
            </li>
            <li>
              <NavLink to="/metricas" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Métricas
              </NavLink>
            </li>
            <li>
              <NavLink to="/ia" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Asistente
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="navbar-actions">
          {backendStatus === 'online' ? (
            <span className="backend-status-pill" title="Servicio en línea">
              <span className="status-dot-pulse"></span>
              En línea
            </span>
          ) : backendStatus === 'offline' ? (
            <span className="backend-status-pill" style={{ backgroundColor: 'var(--status-error-bg)', color: 'var(--status-error-text)', borderColor: 'var(--status-error-border)' }} title="Servicio sin conexión">
              <span className="status-dot-pulse" style={{ backgroundColor: 'var(--status-error-dot)' }}></span>
              Sin conexión
            </span>
          ) : (
            <span className="backend-status-pill" style={{ opacity: 0.7 }}>
              <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1 }}></span>
              Conectando...
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
