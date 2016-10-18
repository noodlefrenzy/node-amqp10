'use strict';
var Builder = require('buffer-builder'),
    DescribedType = require('../../../lib/types/described_type'),
    m = require('../../../lib/types/message'),
    tu = require('../../testing_utils'),
    errors = require('../../../lib/errors'),
    expect = require('chai').expect;

describe('Message Sections', function() {
describe('Header', function() {
  it('should encode the section', function() {
    var message = {
      header: {
        durable: true,
        priority: 2,
        ttl: 150,
        firstAcquirer: true,
        deliveryCount: 0
      }
    };

    var expected = tu.buildBuffer([
      0x00, 0x53, 0x70,
        0xc0, 0x08, 0x05,
        0x41,
        0x50, 0x02,
        0x52, 0x96,
        0x41,
        0x43
    ]);

    var actual = new Builder();
    m.encodeMessage(message, actual);
    expect(expected).to.eql(actual.get());
  });

  it('should encode default value for priority as ubyte', function() {
    var message = { header: { durable: true } };
    var expected = tu.buildBuffer([
      0x00, 0x53, 0x70,
        0xc0, 0x07, 0x05,
        0x41,
        0x50, 0x04,
        0x40,
        0x42,
        0x43
    ]);

    var actual = new Builder();
    m.encodeMessage(message, actual);
    expect(expected).to.eql(actual.get());
  });

  it('should decode the section', function() {
    var buffer = tu.newBuffer([
      0x00, 0x53, 0x70,
        0xc0, 0x0c, 0x05,
        0x41,
        0x50, 0x02,
        0x52, 0x96,
        0x41,
        0x70, 0x00, 0x00, 0x00, 0x00
    ]);

    var message = m.decodeMessage(buffer);
    expect(message).to.have.keys('header');
    expect(message.header).to.eql({
      durable: true,
      priority: 2,
      ttl: 150,
      firstAcquirer: true,
      deliveryCount: 0
    });
  });
}); // Header

describe('DeliveryAnnotations', function() {
  it('should encode the section', function() {
    var message = {
      deliveryAnnotations: {
        'x-foo' : 5,
        'x-bar' : 'wibble'
      }
    };

    var expected = tu.buildBuffer([
      0x00, 0x53, 0x71,
        0xc1, 0x19, 0x04,
        0xa3, 0x05, 0x78, 0x2d, 0x66, 0x6f, 0x6f,
        0x52, 0x05,
        0xa3, 0x05, 0x78, 0x2d, 0x62, 0x61, 0x72,
        0xa1, 0x06, 0x77, 0x69, 0x62, 0x62, 0x6c, 0x65
    ]);

    var actual = new Builder();
    m.encodeMessage(message, actual);
    expect(expected).to.eql(actual.get());
  });

  it('should decode the section', function() {
    var buffer = tu.newBuffer([
      0x00, 0x53, 0x71,
        0xc1, 0x19, 0x04,
        0xa3, 0x05, 0x78, 0x2d, 0x66, 0x6f, 0x6f,
        0x52, 0x05,
        0xa3, 0x05, 0x78, 0x2d, 0x62, 0x61, 0x72,
        0xa1, 0x06, 0x77, 0x69, 0x62, 0x62, 0x6c, 0x65
    ]);

    var message = m.decodeMessage(buffer);
    expect(message).to.have.keys('deliveryAnnotations');
    expect(message.deliveryAnnotations).to.eql({
      'x-foo' : 5,
      'x-bar' : 'wibble'
    });
  });
}); // DeliveryAnnotations

describe('MessageAnnotations', function() {
  it('should encode the section', function() {
    var message = {
      messageAnnotations: {
        'x-foo' : 5,
        'x-bar' : 'wibble'
      }
    };

    var expected = tu.buildBuffer([
      0x00, 0x53, 0x72,
        0xc1, 0x19, 0x04,
        0xa3, 0x05, 0x78, 0x2d, 0x66, 0x6f, 0x6f,
        0x52, 0x05,
        0xa3, 0x05, 0x78, 0x2d, 0x62, 0x61, 0x72,
        0xa1, 0x06, 0x77, 0x69, 0x62, 0x62, 0x6c, 0x65
    ]);

    var actual = new Builder();
    m.encodeMessage(message, actual);
    expect(expected).to.eql(actual.get());
  });

  it('should decode the section', function() {
    var buffer = tu.newBuffer([
      0x00, 0x53, 0x72,
        0xc1, 0x19, 0x04,
        0xa3, 0x05, 0x78, 0x2d, 0x66, 0x6f, 0x6f,
        0x52, 0x05,
        0xa3, 0x05, 0x78, 0x2d, 0x62, 0x61, 0x72,
        0xa1, 0x06, 0x77, 0x69, 0x62, 0x62, 0x6c, 0x65
    ]);

    var message = m.decodeMessage(buffer);
    expect(message).to.have.keys('messageAnnotations');
    expect(message.messageAnnotations).to.eql({
      'x-foo' : 5,
      'x-bar' : 'wibble'
    });
  });
}); // MessageAnnotations

describe('Properties', function() {
  it('should encode the section', function() {
    var message = {
      properties: {
        messageId: 42,
        userId: new Buffer('user'),
        to: 'mom',
        subject: 'hello!',
        replyTo: 'amq.topic',
        correlationId: 'msg-001',
        contentType: 'text/plain',
        contentEncoding: 'UTF-8',
        groupId: 'group-one',
        groupSequence: 2,
        replyToGroupId: 'group-two',
        absoluteExpiryTime: new Date('1970-01-17T20:17:59.232Z'),
        creationTime: new Date('2016-02-14T19:47:12.198Z')
      }
    };

    var expected = tu.buildBuffer([
      0x00, 0x53, 0x73,
        0xc0, 0x67, 0x0d,
        0x52, 0x2a,
        0xa0, 0x04, 0x75, 0x73, 0x65, 0x72,
        0xa1, 0x03, 0x6d, 0x6f, 0x6d,
        0xa1, 0x06, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x21,
        0xa1, 0x09, 0x61, 0x6d, 0x71, 0x2e, 0x74, 0x6f, 0x70, 0x69, 0x63,
        0xa1, 0x07, 0x6d, 0x73, 0x67, 0x2d, 0x30, 0x30, 0x31,
        0xa3, 0x0a, 0x74, 0x65, 0x78, 0x74, 0x2f, 0x70, 0x6c, 0x61, 0x69, 0x6e,
        0xa3, 0x05, 0x55, 0x54, 0x46, 0x2d, 0x38,
        0x83, 0x00, 0x00, 0x00, 0x00, 0x56, 0xc0, 0xd9, 0xc0,
        0x83, 0x00, 0x00, 0x01, 0x52, 0xe1, 0x52, 0x96, 0xc6,
        0xa1, 0x09, 0x67, 0x72, 0x6f, 0x75, 0x70, 0x2d, 0x6f, 0x6e, 0x65,
        0x52, 0x02,
        0xa1, 0x09, 0x67, 0x72, 0x6f, 0x75, 0x70, 0x2d, 0x74, 0x77, 0x6f
    ]);

    var actual = new Builder();
    m.encodeMessage(message, actual);
    expect(expected).to.eql(actual.get());
  });

  it('should decode the section', function() {
    var buffer = tu.newBuffer([
      0x00, 0x53, 0x73,
        0xc0, 0x67, 0x0d,
        0x52, 0x2a,
        0xa0, 0x04, 0x75, 0x73, 0x65, 0x72,
        0xa1, 0x03, 0x6d, 0x6f, 0x6d,
        0xa1, 0x06, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x21,
        0xa1, 0x09, 0x61, 0x6d, 0x71, 0x2e, 0x74, 0x6f, 0x70, 0x69, 0x63,
        0xa1, 0x07, 0x6d, 0x73, 0x67, 0x2d, 0x30, 0x30, 0x31,
        0xa3, 0x0a, 0x74, 0x65, 0x78, 0x74, 0x2f, 0x70, 0x6c, 0x61, 0x69, 0x6e,
        0xa3, 0x05, 0x55, 0x54, 0x46, 0x2d, 0x38,
        0x83, 0x00, 0x00, 0x00, 0x00, 0x56, 0xc0, 0xd9, 0xc0,
        0x83, 0x00, 0x00, 0x01, 0x52, 0xe1, 0x52, 0x96, 0xc6,
        0xa1, 0x09, 0x67, 0x72, 0x6f, 0x75, 0x70, 0x2d, 0x6f, 0x6e, 0x65,
        0x52, 0x02,
        0xa1, 0x09, 0x67, 0x72, 0x6f, 0x75, 0x70, 0x2d, 0x74, 0x77, 0x6f
    ]);

    var message = m.decodeMessage(buffer);
    expect(message).to.have.keys('properties');
    expect(message.properties).to.eql({
      messageId: 42,
      userId: new Buffer('user'),
      to: 'mom',
      subject: 'hello!',
      replyTo: 'amq.topic',
      correlationId: 'msg-001',
      contentType: 'text/plain',
      contentEncoding: 'UTF-8',
      groupId: 'group-one',
      groupSequence: 2,
      replyToGroupId: 'group-two',
      absoluteExpiryTime: new Date('1970-01-17T20:17:59.232Z'),
      creationTime: new Date('2016-02-14T19:47:12.198Z')
    });
  });
}); // Properties

describe('ApplicationProperties', function() {
  it('should encode the section', function() {
    var message = {
      applicationProperties: {
        something: 'special'
      }
    };

    var expected = tu.buildBuffer([
      0x00, 0x53, 0x74,
        0xc1, 0x15,0x02,
        0xa1, 0x09, 0x73, 0x6f, 0x6d, 0x65, 0x74, 0x68, 0x69, 0x6e, 0x67,
        0xa1, 0x07, 0x73, 0x70, 0x65, 0x63, 0x69, 0x61, 0x6c
    ]);

    var actual = new Builder();
    m.encodeMessage(message, actual);
    expect(expected).to.eql(actual.get());
  });

  it('should decode the section', function() {
    var buffer = tu.newBuffer([
      0x00, 0x53, 0x74,
        0xc1, 0x15,0x02,
        0xa1, 0x09, 0x73, 0x6f, 0x6d, 0x65, 0x74, 0x68, 0x69, 0x6e, 0x67,
        0xa1, 0x07, 0x73, 0x70, 0x65, 0x63, 0x69, 0x61, 0x6c
    ]);

    var message = m.decodeMessage(buffer);
    expect(message).to.have.keys('applicationProperties');
    expect(message.applicationProperties).to.eql({
      something: 'special'
    });
  });
}); // ApplicationProperties

describe('Footer', function() {
  it('should encode the section', function() {
    var message = {
      footer: {
        'x-foo' : 5,
        'x-bar' : 'wibble'
      }
    };

    var expected = tu.buildBuffer([
      0x00, 0x53, 0x78,
        0xc1, 0x19, 0x04,
        0xa1, 0x05, 0x78, 0x2d, 0x66, 0x6f, 0x6f,
        0x52, 0x05,
        0xa1, 0x05, 0x78, 0x2d, 0x62, 0x61, 0x72,
        0xa1, 0x06, 0x77, 0x69, 0x62, 0x62, 0x6c, 0x65
    ]);

    var actual = new Builder();
    m.encodeMessage(message, actual);
    expect(actual.get()).to.eql(expected);
  });

  it('should decode the section', function() {
    var buffer = tu.newBuffer([
      0x00, 0x53, 0x78,
        0xc1, 0x19, 0x04,
        0xa1, 0x05, 0x78, 0x2d, 0x66, 0x6f, 0x6f,
        0x52, 0x05,
        0xa1, 0x05, 0x78, 0x2d, 0x62, 0x61, 0x72,
        0xa1, 0x06, 0x77, 0x69, 0x62, 0x62, 0x6c, 0x65
    ]);

    var message = m.decodeMessage(buffer);
    expect(message).to.have.keys('footer');
    expect(message.footer).to.eql({
      'x-foo' : 5,
      'x-bar' : 'wibble'
    });
  });
}); // Footer

describe('Data', function() {
  it('should encode the section', function() {
    var message = {
      body: new Buffer('this is a test')
    };

    var expected = tu.buildBuffer([
      0x00, 0x53, 0x75,
        0xa0, 0x0e, 0x74, 0x68, 0x69, 0x73, 0x20, 0x69, 0x73, 0x20, 0x61, 0x20, 0x74, 0x65, 0x73, 0x74
    ]);

    var actual = new Builder();
    m.encodeMessage(message, actual);
    expect(actual.get()).to.eql(expected);
  });

  it('should decode the section', function() {
    var buffer = tu.newBuffer([
      0x00, 0x53, 0x75,
        0xa0, 0x0e, 0x74, 0x68, 0x69, 0x73, 0x20, 0x69, 0x73, 0x20, 0x61, 0x20, 0x74, 0x65, 0x73, 0x74
    ]);

    var message = m.decodeMessage(buffer);
    expect(message).to.have.keys('body');
    expect(message.body).to.eql(new Buffer('this is a test'));
  });
}); // Data

describe('AMQPSequence', function() {
  it('should encode the section', function() {
    var message = {
      body: [123, 456]
    };

    var expected = tu.buildBuffer([
      0x00, 0x53, 0x76,
        0xc0, 0x08, 0x02,
          0x52, 0x7b,
          0x70, 0x00, 0x00, 0x01, 0xc8
    ]);

    var actual = new Builder();
    m.encodeMessage(message, actual);
    expect(actual.get()).to.eql(expected);
  });

  it('should decode the section', function() {
    var buffer = tu.newBuffer([
      0x00, 0x53, 0x76,
        0xc0, 0x08, 0x02,
          0x52, 0x7b,
          0x70, 0x00, 0x00, 0x01, 0xc8
    ]);

    var message = m.decodeMessage(buffer);
    expect(message).to.have.keys('body');
    expect(message.body).to.eql([ 123, 456 ]);
  });
}); // AMQPSequence

describe('AMQPValue', function() {
  it('should encode the section', function() {
    var message = {
      body: 'this is a test'
    };

    var expected = tu.buildBuffer([
      0x00, 0x53, 0x77,
        0xa1, 0x0e, 0x74, 0x68, 0x69, 0x73, 0x20, 0x69, 0x73, 0x20, 0x61, 0x20, 0x74, 0x65, 0x73, 0x74
    ]);

    var actual = new Builder();
    m.encodeMessage(message, actual);
    expect(actual.get()).to.eql(expected);
  });

  it('should encode the value zero', function() {
    var message = { body: 0 };
    var expected = tu.buildBuffer([
      0x00, 0x53, 0x77,
        0x43  // uint0
    ]);

    var actual = new Builder();
    m.encodeMessage(message, actual);
    expect(expected).to.eql(actual.get());
  });

  it('should decode the section', function() {
    var buffer = tu.newBuffer([
      0x00, 0x53, 0x77,
        0xa1, 0x0e, 0x74, 0x68, 0x69, 0x73, 0x20, 0x69, 0x73, 0x20, 0x61, 0x20, 0x74, 0x65, 0x73, 0x74
    ]);

    var message = m.decodeMessage(buffer);
    expect(message).to.have.keys('body');
    expect(message.body).to.eql('this is a test');
  });
}); // AMQPValue

describe('Custom DescribedType as Body', function() {
  it('should encode the section', function() {
    var message = {
      body: new DescribedType(0x77, new Buffer('this is a test'))
    };

    var expected = tu.buildBuffer([
      0x00, 0x53, 0x77,
        0xa0, 0x0e, 0x74, 0x68, 0x69, 0x73, 0x20, 0x69, 0x73, 0x20, 0x61, 0x20, 0x74, 0x65, 0x73, 0x74
    ]);

    var actual = new Builder();
    m.encodeMessage(message, actual);
    expect(actual.get()).to.eql(expected);
  });

  it('should decode the section', function() {
    var buffer = tu.newBuffer([
      0x00, 0x53, 0x77,
        0xa0, 0x0e, 0x74, 0x68, 0x69, 0x73, 0x20, 0x69, 0x73, 0x20, 0x61, 0x20, 0x74, 0x65, 0x73, 0x74
    ]);

    var message = m.decodeMessage(buffer);
    expect(message).to.have.keys('body');
    expect(message.body).to.eql(new Buffer('this is a test'));
  });

  it('should reject an invalid type', function() {
    var message = {
      body: new DescribedType(0x07, 'this is a test')
    };

    expect(m.encodeMessage.bind(m, message, new Builder()))
        .to.throw(errors.MalformedPayloadError);
  });
}); // Custom


}); // Message Sections
