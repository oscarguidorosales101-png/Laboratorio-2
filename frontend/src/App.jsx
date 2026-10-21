import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import ReservasListPage from './pages/ReservasListPage';
import ReservaDetailPage from './pages/ReservaDetailPage';
import ReservaFormPage from './pages/ReservaFormPage';
import MesasPage from './pages/MesasPage';
import ClientesPage from './pages/ClientesPage';
import HorariosPage from './pages/HorariosPage';
import MetricasPage from './pages/MetricasPage';
import AsistenteIAPage from './pages/AsistenteIAPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/reservas" element={<ReservasListPage />} />
            <Route path="/reservas/nueva" element={<ReservaFormPage />} />
            <Route path="/reservas/:id" element={<ReservaDetailPage />} />
            <Route path="/reservas/:id/editar" element={<ReservaFormPage />} />
            <Route path="/mesas" element={<MesasPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/horarios" element={<HorariosPage />} />
            <Route path="/metricas" element={<MetricasPage />} />
            <Route path="/ia" element={<AsistenteIAPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
