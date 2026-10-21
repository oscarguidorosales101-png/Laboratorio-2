const clientesService = require('../services/clientes.service');

const getAll = async (req, res, next) => {
  try {
    const { search } = req.query;
    const data = await clientesService.getAllClientes({ search });
    res.status(200).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cliente = await clientesService.getClienteById(id);
    if (!cliente) {
      return res.status(404).json({ ok: false, error: `Cliente con ID ${id} no encontrado.` });
    }
    res.status(200).json({ ok: true, data: cliente });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { nombre, telefono, email } = req.body;
    const nuevoCliente = await clientesService.createCliente({ nombre, telefono, email });
    res.status(201).json({ ok: true, data: nuevoCliente });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, telefono, email } = req.body;
    const clienteActualizado = await clientesService.updateCliente(id, { nombre, telefono, email });
    res.status(200).json({ ok: true, data: clienteActualizado });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await clientesService.deleteCliente(id);
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
