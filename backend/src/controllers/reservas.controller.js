const reservasService = require('../services/reservas.service');

const getAll = async (req, res, next) => {
  try {
    const { fecha, estado, mesa_id, cliente_id, q } = req.query;
    const data = await reservasService.getAllReservas({ fecha, estado, mesa_id, cliente_id, q });
    res.status(200).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reserva = await reservasService.getReservaById(id);
    if (!reserva) {
      return res.status(404).json({ ok: false, error: `Reserva con ID ${id} no encontrada.` });
    }
    res.status(200).json({ ok: true, data: reserva });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { cliente_id, mesa_id, fecha, hora_inicio, personas, nota } = req.body;
    const nuevaReserva = await reservasService.createReserva({
      cliente_id,
      mesa_id,
      fecha,
      hora_inicio,
      personas,
      nota,
    });
    res.status(201).json({ ok: true, data: nuevaReserva });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { mesa_id, fecha, hora_inicio, personas, nota } = req.body;
    const reservaActualizada = await reservasService.updateReserva(id, {
      mesa_id,
      fecha,
      hora_inicio,
      personas,
      nota,
    });
    res.status(200).json({ ok: true, data: reservaActualizada });
  } catch (error) {
    next(error);
  }
};

const updateEstado = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    if (!estado) {
      return res.status(400).json({ ok: false, error: 'El campo "estado" es obligatorio.' });
    }
    const reservaActualizada = await reservasService.updateEstadoReserva(id, estado);
    res.status(200).json({ ok: true, data: reservaActualizada });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await reservasService.deleteReserva(id);
    res.status(200).json({ ok: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  updateEstado,
  remove,
};
