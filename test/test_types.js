var should      = require('should'),
    Types       = require('../lib/types');

describe('Types', function() {
    describe('#parse()', function() {

        it('should parse types.xml', function(done) {
            var types = new Types();
            types.parse('./resources/types.xml', function(err) {
                if (err) {
                    should.fail('Failed to load or parse types: ' + err);
                } else {
                    console.log('Succeeded in loading and parsing');
                }
                done();
            });
        });
    });
});
