# -*- coding: utf-8 -*-
# Generated by the protocol buffer compiler.  DO NOT EDIT!
# source: control.proto
"""Generated protocol buffer code."""
from google.protobuf.internal import builder as _builder
from google.protobuf import descriptor as _descriptor
from google.protobuf import descriptor_pool as _descriptor_pool
from google.protobuf import symbol_database as _symbol_database
# @@protoc_insertion_point(imports)

_sym_db = _symbol_database.Default()




DESCRIPTOR = _descriptor_pool.Default().AddSerializedFile(b'\n\rcontrol.proto\x12\x07\x63ontrol\"\x07\n\x05\x45mpty\"/\n\x0c\x44\x61taResponse\x12\x0e\n\x06\x65stado\x18\x01 \x01(\t\x12\x0f\n\x07valores\x18\x02 \x03(\x05\"\x1e\n\x0b\x44\x61taRequest\x12\x0f\n\x07mensaje\x18\x01 \x01(\t\"-\n\x08Response\x12\x0f\n\x07success\x18\x01 \x01(\x08\x12\x10\n\x08recibido\x18\x02 \x01(\t2w\n\x0e\x43ontrolService\x12\x30\n\x07GetData\x12\x0e.control.Empty\x1a\x15.control.DataResponse\x12\x33\n\x08SendData\x12\x14.control.DataRequest\x1a\x11.control.Responseb\x06proto3')

_builder.BuildMessageAndEnumDescriptors(DESCRIPTOR, globals())
_builder.BuildTopDescriptorsAndMessages(DESCRIPTOR, 'control_pb2', globals())
if _descriptor._USE_C_DESCRIPTORS == False:

  DESCRIPTOR._options = None
  _EMPTY._serialized_start=26
  _EMPTY._serialized_end=33
  _DATARESPONSE._serialized_start=35
  _DATARESPONSE._serialized_end=82
  _DATAREQUEST._serialized_start=84
  _DATAREQUEST._serialized_end=114
  _RESPONSE._serialized_start=116
  _RESPONSE._serialized_end=161
  _CONTROLSERVICE._serialized_start=163
  _CONTROLSERVICE._serialized_end=282
# @@protoc_insertion_point(module_scope)
