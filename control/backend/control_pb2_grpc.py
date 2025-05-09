# Generated by the gRPC Python protocol compiler plugin. DO NOT EDIT!
"""Client and server classes corresponding to protobuf-defined services."""
import grpc

import control_pb2 as control__pb2


class ControlServiceStub(object):
    """Missing associated documentation comment in .proto file."""

    def __init__(self, channel):
        """Constructor.

        Args:
            channel: A grpc.Channel.
        """
        self.GetData = channel.unary_unary(
                '/ControlService/GetData',
                request_serializer=control__pb2.DataRequest.SerializeToString,
                response_deserializer=control__pb2.DataResponse.FromString,
                )
        self.SendData = channel.unary_unary(
                '/ControlService/SendData',
                request_serializer=control__pb2.DataRequest.SerializeToString,
                response_deserializer=control__pb2.Response.FromString,
                )
        self.GetHistoricalData = channel.unary_unary(
                '/ControlService/GetHistoricalData',
                request_serializer=control__pb2.HistoricalDataRequest.SerializeToString,
                response_deserializer=control__pb2.HistoricalDataResponse.FromString,
                )
        self.StreamData = channel.unary_stream(
                '/ControlService/StreamData',
                request_serializer=control__pb2.StreamRequest.SerializeToString,
                response_deserializer=control__pb2.DataResponse.FromString,
                )


class ControlServiceServicer(object):
    """Missing associated documentation comment in .proto file."""

    def GetData(self, request, context):
        """Missing associated documentation comment in .proto file."""
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details('Method not implemented!')
        raise NotImplementedError('Method not implemented!')

    def SendData(self, request, context):
        """Missing associated documentation comment in .proto file."""
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details('Method not implemented!')
        raise NotImplementedError('Method not implemented!')

    def GetHistoricalData(self, request, context):
        """Missing associated documentation comment in .proto file."""
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details('Method not implemented!')
        raise NotImplementedError('Method not implemented!')

    def StreamData(self, request, context):
        """Add this new streaming RPC
        """
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details('Method not implemented!')
        raise NotImplementedError('Method not implemented!')


def add_ControlServiceServicer_to_server(servicer, server):
    rpc_method_handlers = {
            'GetData': grpc.unary_unary_rpc_method_handler(
                    servicer.GetData,
                    request_deserializer=control__pb2.DataRequest.FromString,
                    response_serializer=control__pb2.DataResponse.SerializeToString,
            ),
            'SendData': grpc.unary_unary_rpc_method_handler(
                    servicer.SendData,
                    request_deserializer=control__pb2.DataRequest.FromString,
                    response_serializer=control__pb2.Response.SerializeToString,
            ),
            'GetHistoricalData': grpc.unary_unary_rpc_method_handler(
                    servicer.GetHistoricalData,
                    request_deserializer=control__pb2.HistoricalDataRequest.FromString,
                    response_serializer=control__pb2.HistoricalDataResponse.SerializeToString,
            ),
            'StreamData': grpc.unary_stream_rpc_method_handler(
                    servicer.StreamData,
                    request_deserializer=control__pb2.StreamRequest.FromString,
                    response_serializer=control__pb2.DataResponse.SerializeToString,
            ),
    }
    generic_handler = grpc.method_handlers_generic_handler(
            'ControlService', rpc_method_handlers)
    server.add_generic_rpc_handlers((generic_handler,))


 # This class is part of an EXPERIMENTAL API.
class ControlService(object):
    """Missing associated documentation comment in .proto file."""

    @staticmethod
    def GetData(request,
            target,
            options=(),
            channel_credentials=None,
            call_credentials=None,
            insecure=False,
            compression=None,
            wait_for_ready=None,
            timeout=None,
            metadata=None):
        return grpc.experimental.unary_unary(request, target, '/ControlService/GetData',
            control__pb2.DataRequest.SerializeToString,
            control__pb2.DataResponse.FromString,
            options, channel_credentials,
            insecure, call_credentials, compression, wait_for_ready, timeout, metadata)

    @staticmethod
    def SendData(request,
            target,
            options=(),
            channel_credentials=None,
            call_credentials=None,
            insecure=False,
            compression=None,
            wait_for_ready=None,
            timeout=None,
            metadata=None):
        return grpc.experimental.unary_unary(request, target, '/ControlService/SendData',
            control__pb2.DataRequest.SerializeToString,
            control__pb2.Response.FromString,
            options, channel_credentials,
            insecure, call_credentials, compression, wait_for_ready, timeout, metadata)

    @staticmethod
    def GetHistoricalData(request,
            target,
            options=(),
            channel_credentials=None,
            call_credentials=None,
            insecure=False,
            compression=None,
            wait_for_ready=None,
            timeout=None,
            metadata=None):
        return grpc.experimental.unary_unary(request, target, '/ControlService/GetHistoricalData',
            control__pb2.HistoricalDataRequest.SerializeToString,
            control__pb2.HistoricalDataResponse.FromString,
            options, channel_credentials,
            insecure, call_credentials, compression, wait_for_ready, timeout, metadata)

    @staticmethod
    def StreamData(request,
            target,
            options=(),
            channel_credentials=None,
            call_credentials=None,
            insecure=False,
            compression=None,
            wait_for_ready=None,
            timeout=None,
            metadata=None):
        return grpc.experimental.unary_stream(request, target, '/ControlService/StreamData',
            control__pb2.StreamRequest.SerializeToString,
            control__pb2.DataResponse.FromString,
            options, channel_credentials,
            insecure, call_credentials, compression, wait_for_ready, timeout, metadata)
