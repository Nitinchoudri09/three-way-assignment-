const documentService = require('../services/documentService');
const { Document } = require('../models/Document');
const { success, error } = require('../utils/response');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');

exports.uploadDocument = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return error(res, errors.array()[0].msg, 400);
    
    if (!req.file) return error(res, 'No file uploaded', 400);

    const result = await documentService.processUpload(req.file, req.body.documentType);
    success(res, result, 201);
  } catch (err) {
    next(err);
  }
};

exports.getDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id).populate('items.skuMaster');
    if (!doc) return error(res, 'Document not found', 404);
    success(res, doc);
  } catch (err) {
    next(err);
  }
};

exports.getFile = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return error(res, 'Document not found', 404);
    
    const absolutePath = path.resolve(doc.filePath);
    if (fs.existsSync(absolutePath)) {
      res.setHeader('Content-Type', doc.mimeType);
      res.sendFile(absolutePath);
    } else {
      error(res, 'File not found on disk', 404);
    }
  } catch (err) {
    next(err);
  }
};

exports.getDocuments = async (req, res, next) => {
  try {
    const { type, poNumber } = req.query;
    const query = {};
    if (type) query.documentType = type;
    if (poNumber) query.poNumber = poNumber;
    
    const docs = await Document.find(query).populate('items.skuMaster');
    success(res, docs);
  } catch (err) {
    next(err);
  }
};
