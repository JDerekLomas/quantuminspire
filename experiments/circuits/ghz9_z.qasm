version 3.0

qubit[9] q
bit[9] b
// === 9-qubit GHZ state, Z-basis measurement ===

// H on q0
Rz(3.1415926536) q[0]
Ry(1.5707963268) q[0]

// CNOT cascade along spanning tree
// CNOT 0→1
Ry(-1.5707963268) q[1]
CZ q[0], q[1]
Ry(1.5707963268) q[1]
// CNOT 0→2
Ry(-1.5707963268) q[2]
CZ q[0], q[2]
Ry(1.5707963268) q[2]
// CNOT 1→3
Ry(-1.5707963268) q[3]
CZ q[1], q[3]
Ry(1.5707963268) q[3]
// CNOT 1→4
Ry(-1.5707963268) q[4]
CZ q[1], q[4]
Ry(1.5707963268) q[4]
// CNOT 2→5
Ry(-1.5707963268) q[5]
CZ q[2], q[5]
Ry(1.5707963268) q[5]
// CNOT 4→6
Ry(-1.5707963268) q[6]
CZ q[4], q[6]
Ry(1.5707963268) q[6]
// CNOT 4→7
Ry(-1.5707963268) q[7]
CZ q[4], q[7]
Ry(1.5707963268) q[7]
// CNOT 6→8
Ry(-1.5707963268) q[8]
CZ q[6], q[8]
Ry(1.5707963268) q[8]

b = measure q
