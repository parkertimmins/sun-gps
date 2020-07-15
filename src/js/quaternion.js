
class Quaternions {
    // internal [s, v] - external [v, s]
    static toInternalQuat(q) {
        return [q[3], q[0], q[1], q[2]]
    }

    static rotate(vector, quaternion) {
        const quatVector = [0].concat(vector);
        return Quaternions.multiply(
            Quaternions.multiply(quaternion, quatVector), 
            Quaternions.inverse(quaternion)
        );
    }

    static squaredNorm(q) {
        return q[0]*q[0] + q[1]*q[1] + q[2]*q[2] + q[3]*q[3]
    }

    static multiply(q, r) {
        return [
            r[0] * q[0] - r[1] * q[1] - r[2] * q[2] - r[3] * q[3], 
            r[0] * q[1] + r[1] * q[0] - r[2] * q[3] + r[3] * q[2], 
            r[0] * q[2] + r[1] * q[3] + r[2] * q[0] - r[3] * q[1], 
            r[0] * q[3] - r[1] * q[2] + r[2] * q[1] + r[3] * q[0], 
        ];
    }

    static inverse(q) {
        const sn =  Quaternions.squaredNorm(q)
        return [q[0], -q[1], -q[2], -q[3]].map(a => a * 1.0 / sn)
    }
}

