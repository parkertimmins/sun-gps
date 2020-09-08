import { locationFromBearingDistance } from '../src/js/celestial';
import { assert, expect } from 'chai';

const delta = 0.00001

describe('locationFromBearingDistance', function () {
    it('should go to north pole', function () {
        const { lat, long } = locationFromBearingDistance({ lat: 0, long: 0 }, 0, 90)
        assert.closeTo(lat, 90, delta);
    });
    
    it('should go 90 degrees east', function () {
        const { lat, long } = locationFromBearingDistance({ lat: 0, long: 0 }, 90, 90)
        assert.closeTo(lat, 0, delta);
        assert.closeTo(long, 270, delta);
    });
    
    it('should go to south pole', function () {
        const { lat, long } = locationFromBearingDistance({ lat: 0, long: 0 }, 180, 90)
        assert.closeTo(lat, -90, delta);
    });
    
    it('should go 90 degrees west', function () {
        const { lat, long } = locationFromBearingDistance({ lat: 0, long: 0 }, 270, 90)
        assert.closeTo(lat, 0, delta);
        assert.closeTo(long, 90, delta);
    });

    it('should go 90 degrees ne', function () {
        const { lat, long } = locationFromBearingDistance({ lat: 0, long: 0 }, 45, 90)
        assert.closeTo(lat, 45, delta);
        assert.closeTo(long, 270, delta);
    });
    
    it('should go 90 degrees se', function () {
        const { lat, long } = locationFromBearingDistance({ lat: 0, long: 0 }, 135, 90)
        assert.closeTo(lat, -45, delta);
        assert.closeTo(long, 270, delta);
    });
    
    it('should go 90 degrees sw', function () {
        const { lat, long } = locationFromBearingDistance({ lat: 0, long: 0 }, 225, 90)
        assert.closeTo(lat, -45, delta);
        assert.closeTo(long, 90, delta);
    });
    
    it('should go 90 degrees nw', function () {
        const { lat, long } = locationFromBearingDistance({ lat: 0, long: 0 }, 315, 90)
        assert.closeTo(lat, 45, delta);
        assert.closeTo(long, 90, delta);
    });
    
    it('should go to opposite side of globe', function () {
        const { lat, long } = locationFromBearingDistance({ lat: 0, long: 0 }, 180, 180)
        assert.closeTo(lat, 0, delta);
        assert.closeTo(long, 180, delta);
    });
});


