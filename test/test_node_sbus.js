var debug       = require('debug')('amqp10-test_amqpclient'),
    should      = require('should'),

    EH          = require('../lib/adapters/node_sbus').NodeSbusEventHubAdapter,

    tu          = require('./testing_utils');

describe('NodeSbusEventHubAdapter', function() {
    describe('#ParseAddress()', function () {

        it('should match consumer URI', function () {
            var uri = 'amqps://bob:dobbs@mysb.servicebus.windows.net/myeh/ConsumerGroups/$Default/Partitions/1';
            var parsed = EH.ParseAddress(uri);
            parsed.eventHubName.should.eql('myeh');
            parsed.path.should.eql('ConsumerGroups/$Default/Partitions/1');
        });
    });
});
