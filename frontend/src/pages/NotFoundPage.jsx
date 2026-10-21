import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{ maxWidth: '500px', margin: '80px auto', textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🍽️ 404</div>
      <h1 className="page-title" style={{ marginBottom: '12px' }}>Página No Encontrada</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        La ruta solicitada no existe o no se encuentra disponible en la aplicación.
      </p>
      <Link to="/" className="btn btn-primary">
        Volver al Panel Principal
      </Link>
    </div>
  );
}
