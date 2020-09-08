import { bearing } from '../src/js/celestial';
import { assert } from 'chai';

describe('bearing', function () {
    it('should be 0 to north', function () {
      assert.equal(bearing({ lat: 0, long: 0 }, { lat: 10, long: 0 }), 0);
    });
    
    it('should be 90 to east', function () {
      assert.equal(bearing({ lat: 0, long: 0 }, { lat: 0, long: -10 }), 90);
    });
    
    it('should be 180 to south', function () {
      assert.equal(bearing({ lat: 0, long: 0 }, { lat: -10, long: 0 }), 180);
    });
    
    it('should be 270 to west', function () {
      assert.equal(bearing({ lat: 0, long: 0 }, { lat: 0, long: 10 }), 270);
    });
    
    it('should be 45 to ne', function () {
      assert.equal(bearing({ lat: 0, long: 0 }, { lat: 45, long: 270 }), 45);
    });
    
    it('should be 135 to se', function () {
      assert.equal(bearing({ lat: 0, long: 0 }, { lat: -45, long: 270 }), 135);
    });
    
    it('should be 225 to sw', function () {
      assert.equal(bearing({ lat: 0, long: 0 }, { lat: -45, long: 90 }), 225);
    });
    
    it('should be 315 to sw', function () {
      assert.equal(bearing({ lat: 0, long: 0 }, { lat: 45, long: 90 }), 315);
    });
});



