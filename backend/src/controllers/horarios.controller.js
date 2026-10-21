const horariosService = require('../services/horarios.service');

const getAll = async (req, res, next) => {
  try {
    const data = await horariosService.getAllHorarios();
    res.status(200).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
};

const getByDia = async (req, res, next) => {
  try {
    const { dia } = req.params;
    const data = await horariosService.getHorarioByDia(dia);
    if (!data) {
      return res.status(404).json({ ok: false, error: `Horario para el día ${dia} no encontrado.` });
    }
    res.status(200).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { abierto, apertura, cierre } = req.body;
    const data = await horariosService.updateHorario(id, { abierto, apertura, cierre });
    res.status(200).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getByDia,
  update,
};
