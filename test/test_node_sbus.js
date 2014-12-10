var debug       = require('debug')('amqp10-test_node_sbus'),
    should      = require('should'),

    EH          = require('../lib/adapters/node_sbus').NodeSbusEventHubAdapter,

    DescribedType   = require('../lib/types/described_type'),
    Symbol      = require('../lib/types/symbol'),

    tu          = require('./testing_utils');

describe('NodeSbusEventHubAdapter', function() {
    describe('#ParseAddress()', function () {

        it('should match consumer URI', function () {
            var uri = 'amqps://bob:dobbs@mysb.servicebus.windows.net/myeh/ConsumerGroups/$Default/Partitions/1';
            var parsed = EH.parseAddress(uri);
            parsed.eventHubName.should.eql('myeh');
            parsed.path.should.eql('myeh/ConsumerGroups/$Default/Partitions/1');
            parsed.subpath.should.eql('ConsumerGroups/$Default/Partitions/1');
        });
    });

    describe('#mapType()', function() {
        it('should map strings', function() {
            var eha = new EH();
            var str = eha._mapType([ 'string', 'foo' ]);
            str.should.eql('foo');
            (typeof str).should.eql('string');
        });
        it('should map symbols', function() {
            var eha = new EH();
            var sym = eha._mapType([ 'symbol', 'foo' ]);
            sym.should.be.instanceof(Symbol);
            sym.contents.should.eql('foo');
        });
        it('should map described types', function() {
            var eha = new EH();
            var des = eha._mapType(['described', ['symbol', 'k'], ['string', 'v']]);
            des.should.be.instanceof(DescribedType);
            des.descriptor.should.be.instanceof(Symbol);
            des.descriptor.contents.should.eql('k');
            des.value.should.eql('v');
            (typeof des.value).should.eql('string');
        });
    });
});
