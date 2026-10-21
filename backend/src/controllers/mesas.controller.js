const mesasService = require('../services/mesas.service');

const getAll = async (req, res, next) => {
  try {
    const { activa, ubicacion, capacidadMin } = req.query;
    const data = await mesasService.getAllMesas({ activa, ubicacion, capacidadMin });
    res.status(200).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const mesa = await mesasService.getMesaById(id);
    if (!mesa) {
      return res.status(404).json({ ok: false, error: `Mesa con ID ${id} no encontrada.` });
    }
    res.status(200).json({ ok: true, data: mesa });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { numero, capacidad, ubicacion, activa } = req.body;
    const nuevaMesa = await mesasService.createMesa({ numero, capacidad, ubicacion, activa });
    res.status(201).json({ ok: true, data: nuevaMesa });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { numero, capacidad, ubicacion, activa } = req.body;
    const mesaActualizada = await mesasService.updateMesa(id, { numero, capacidad, ubicacion, activa });
    res.status(200).json({ ok: true, data: mesaActualizada });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await mesasService.deleteMesa(id);
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
  remove,
};
