//  Intel 8080 manual:
//  http://bitsavers.trailing-edge.com/components/intel/MCS80/9800301D_8080_8085_Assembly_Language_Programming_Manual_May81.pdf

var disassembler;
const reader = new FileReader();
var files;
var file;
var fileBuffer;

var ConditionCodes = {
    Z: 0x1,
    S: 0x1,
    P: 0x1,
    CY: 0x1,
    AC: 0x1,
}

var State8080 = {
    a: 0x0,
    b: 0x0,
    c: 0x0,
    d: 0x0,
    e: 0x0,
    h: 0x0,
    l: 0x0,
    sp: 0x0,
    pc: 0x0,
    memory: null,
    cc: ConditionCodes,
    int_enable: 0x0,
}

window.addEventListener('DOMContentLoaded', function() {
    disassembler = document.getElementById("disassembler-table-body");
    const dragfile = this.document.getElementById("drag-file");
    dragfile.addEventListener("dragover", (e)=>{
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    })
    dragfile.addEventListener("drop", (e)=>{
        e.stopPropagation();
        e.preventDefault();
        files = e.dataTransfer.files;
        file = files[0];
        console.log(files);
        const nameSize = file.name.length;
        /*appendLog("----");
        appendLog("Name: " + (file.name ? file.name : "NOT SUPPORTED"));
        appendLog("Size: " + (file.size ? file.size + " bytes" : "NOT SUPPORTED"));*/
        readImage();
    })
});

function appendLog(message){
    if (message == undefined) return;
    if (disassembler == undefined) return;
    const logNode = document.createElement("p");
    logNode.appendChild(document.createTextNode(message));
    disassembler.appendChild(logNode);
}

function appendEmulator(_address, _opcode, _instruction){
    if (disassembler == undefined) return;
    const rowTable = document.createElement("tr");
    const address = document.createElement("td");
    const opcode = document.createElement("td");
    const instruction = document.createElement("td");
    address.appendChild(document.createTextNode(toHexa(_address)));
    for (var i = 0; i < _opcode.length; i++){
        opcode.appendChild(document.createTextNode(toHexa(_opcode[i])));
    }
    instruction.appendChild(document.createTextNode(_instruction));
    rowTable.appendChild(address);
    rowTable.appendChild(opcode);
    rowTable.appendChild(instruction);
    disassembler.appendChild(rowTable);
}

function readImage() {
    reader.readAsArrayBuffer(file);
    reader.addEventListener('loadstart', (event) => {
        //appendLog("Loading file...");
    });
    reader.addEventListener('load', (event) => {
        /*appendLog("Loading successful");
        appendLog("----");*/
        fileBuffer = reader.result;
        //readBuffer();
        disassemblerBuffer();
    });
    reader.addEventListener('error', (event) => {
        /*appendLog("Loading failed");
        appendLog(reader.error);
        appendLog("----");*/
    });
}

function readBuffer(){
    if (State8080.memory == null){
        State8080.memory = new Uint8Array(fileBuffer);
    }
    var bytes;
    for (let i = 0; i < State8080.memory.length; i++){
        if (i % 16 == 0){
            appendLog(bytes);
            bytes = "";
        }
        bytes+="0x" + State8080.memory[i].toString(16) + "\t";
    }
    if (bytes !== ""){
        appendLog(bytes);
    }
}

function toHexa(nbr){
    return "0x" + nbr.toString(16) + " ";
}

function setFlags(result){
    State8080.cc.Z = (result == 0);
    State8080.cc.S = (result & 0x80) != 0;
    State8080.cc.P = parity(result);
    State8080.cc.CY = (result > 0xff);
}

// Check if the number of 1 bits in the result is even
function parity(nbr){
    var count = 0;
    for (let i = 0; i < 8; i++){
        if (nbr & 1) count++;
        nbr = nbr >> 1;
    }
    return (count % 2 == 0);
}

// Method used in SBB instruction named "Two's complement"
function twoComplement(nbr){
    return (~nbr + 1);
}

function push(hight, low){
    State8080.memory[State8080.sp - 1] = hight;
    State8080.memory[State8080.sp - 2] = low;
    State8080.sp -= 2;
}

function push(value){
    State8080.memory[State8080.sp - 1] = (value >> 8) & 0xff;
    State8080.memory[State8080.sp - 2] = value & 0xff;
    State8080.sp -= 2;
}

function pop(){
    State8080.sp += 2;
    return State8080.memory[State8080.sp + 1] << 8 | State8080.memory[State8080.sp];
}

/**
 * Disassemble the buffer
 */

function disassemblerBuffer(){
    if (State8080.memory == null){
        State8080.memory = new Uint8Array(fileBuffer);
    }
    for (let i = 0; i < State8080.memory.length; i++){
        switch(State8080.memory[i]){
            case 0x08:
            case 0x10:
            case 0x18:
            case 0xd9:
            case 0xdd:
            case 0xed:
            case 0xfc:
            case 0xcb:
            case 0xfd:
                break;
            case 0x00:
                appendEmulator(i, [State8080.memory[i]], "NOP");
                break;
            case 0x01:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "LXI B, D16");
                State8080.b = State8080.memory[i+2];
                State8080.c = State8080.memory[i+1];
                i+=2;
                break;
            case 0x02:
                appendEmulator(i, [State8080.memory[i]], "STAX B");
                break;
            case 0x03:
                appendEmulator(i, [State8080.memory[i]], "INX B");
                break;
            case 0x04:
                appendEmulator(i, [State8080.memory[i]], "INR B");
                break;
            case 0x05:
                appendEmulator(i, [State8080.memory[i]], "DCR B");
                break;
            case 0x06:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1]], "MVI B, D8");
                i++;
                break;
            case 0x07:
                appendEmulator(i, [State8080.memory[i]], "RLC");
                break;
            case 0x09:
                appendEmulator(i, [State8080.memory[i]], "DAD B");
                break;
            case 0x0a:
                appendEmulator(i, [State8080.memory[i]], "LDAX B");
                break;
            case 0x0b:
                appendEmulator(i, [State8080.memory[i]], "DCX B");
                break;
            case 0x0c:
                appendEmulator(i, [State8080.memory[i]], "INR C");
                break;
            case 0x0d:
                appendEmulator(i, [State8080.memory[i]], "DCR C");
                break;
            case 0x0e:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1]], "MVI C, D8");
                i++;
                break;
            case 0x0f:
                appendEmulator(i, [State8080.memory[i]], "RRC");
                break;
            case 0x11:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "LXI D, D16");
                i+= 2;
                break;
            case 0x12:
                appendEmulator(i, [State8080.memory[i]], "STAX D");
                break;
            case 0x13:
                appendEmulator(i, [State8080.memory[i]], "INX D");
                break;
            case 0x14:
                appendEmulator(i, [State8080.memory[i]], "INR D");
                break;
            case 0x15:
                appendEmulator(i, [State8080.memory[i]], "DCR D");
                break;
            case 0x16:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1]], "MVI D, D8");
                i++;
                break;
            case 0x17:
                appendEmulator(i, [State8080.memory[i]], "RAL");
                break;
            case 0x19:
                appendEmulator(i, [State8080.memory[i]], "DAD D");
                break;
            case 0x1a:
                appendEmulator(i, [State8080.memory[i]], "LDAX D");
                break;
            case 0x1b:
                appendEmulator(i, [State8080.memory[i]], "DCX D");
                break;
            case 0x1c:
                appendEmulator(i, [State8080.memory[i]], "INR E");
                break;
            case 0x1d:
                appendEmulator(i, [State8080.memory[i]], "DCR E");
                break;
            case 0x1e:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1]], "MVI E, D8");
                i++;
                break;
            case 0x1f:
                appendEmulator(i, [State8080.memory[i]], "RAR");
                break;
            case 0x20:
                appendEmulator(i, [State8080.memory[i]], "RIM");
                break;
            case 0x21:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "LXI H, D16");
                i+= 2;
                break;
            case 0x22:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "SHLD " + toHexa(State8080.memory[i+2]) + toHexa(State8080.memory[i+1] ));
                i+= 2;
                break;
            case 0x23:
                appendEmulator(i, [State8080.memory[i]], "INX H");
                break;
            case 0x24:
                appendEmulator(i, [State8080.memory[i]], "INR H");
                break;
            case 0x25:
                appendEmulator(i, [State8080.memory[i]], "DCR H");
                break;
            case 0x26:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1]], "MVI H, D8");
                i++;
                break;
            case 0x27:
                appendEmulator(i, [State8080.memory[i]], "DAA");
                break;
            case 0x29:
                appendEmulator(i, [State8080.memory[i]], "DAD H");
                break;
            case 0x2a:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "LHLD " + toHexa(State8080.memory[i+2]) + toHexa(State8080.memory[i+1] ));
                i+= 2;
                break;
            case 0x2b:
                appendEmulator(i, [State8080.memory[i]], "DCX H");
                break;
            case 0x2c:
                appendEmulator(i, [State8080.memory[i]], "INR L");
                break;
            case 0x2d:
                appendEmulator(i, [State8080.memory[i]], "DCR L");
                break;
            case 0x2e:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1]], "MVI L, D8");
                i++;
                break;
            case 0x2f:
                appendEmulator(i, [State8080.memory[i]], "CMA");
                break;
            case 0x31:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "LXI SP, D16");
                i+= 2;
                break;
            case 0x32:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "STA " + toHexa(State8080.memory[i+2]) + toHexa(State8080.memory[i+1] ));
                i+= 2;
                break;
            case 0x33:
                appendEmulator(i, [State8080.memory[i]], "INX SP");
                break;
            case 0x34:
                appendEmulator(i, [State8080.memory[i]], "INR M");
                break;
            case 0x35:
                appendEmulator(i, [State8080.memory[i]], "DCR M");
                break;
            case 0x36:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1]], "MVI M,D8");
                i++;
                break;
            case 0x37:
                appendEmulator(i, [State8080.memory[i]], "STC");
                break;
            case 0x39:
                appendEmulator(i, [State8080.memory[i]], "DAD SP");
                break;
            case 0x3a:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "LDA " + toHexa(State8080.memory[i+2]) + toHexa(State8080.memory[i+1] ));
                i+= 2;
                break;
            case 0x3b:
                appendEmulator(i, [State8080.memory[i]], "DCX SP");
                break;
            case 0x3c:
                appendEmulator(i, [State8080.memory[i]], "INR A");
                break;
            case 0x3d:
                appendEmulator(i, [State8080.memory[i]], "DCR A");
                break;
            case 0x3e:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1]], "MVI A,D8");
                i++;
                break;
            case 0x3f:
                appendEmulator(i, [State8080.memory[i]], "CMC");
                break;
            case 0x40:
                appendEmulator(i, [State8080.memory[i]], "MOV B, B");
                break; 
            case 0x41: 
                appendEmulator(i, [State8080.memory[i]], "MOV B, C");
                break; 
            case 0x42: 
                appendEmulator(i, [State8080.memory[i]], "MOV B, D");
                break; 
            case 0x43: 
                appendEmulator(i, [State8080.memory[i]], "MOV B, E");
                break; 
            case 0x44: 
                appendEmulator(i, [State8080.memory[i]], "MOV B, H");
                break; 
            case 0x45: 
                appendEmulator(i, [State8080.memory[i]], "MOV B, L");
                break; 
            case 0x46: 
                appendEmulator(i, [State8080.memory[i]], "MOV B, M");
                break; 
            case 0x47: 
                appendEmulator(i, [State8080.memory[i]], "MOV B, A");
                break; 
            case 0x48: 
                appendEmulator(i, [State8080.memory[i]], "MOV C, B");
                break; 
            case 0x49: 
                appendEmulator(i, [State8080.memory[i]], "MOV C, C");
                break; 
            case 0x4a: 
                appendEmulator(i, [State8080.memory[i]], "MOV C, D");
                break; 
            case 0x4b: 
                appendEmulator(i, [State8080.memory[i]], "MOV C, E");
                break; 
            case 0x4c: 
                appendEmulator(i, [State8080.memory[i]], "MOV C, H");
                break; 
            case 0x4d: 
                appendEmulator(i, [State8080.memory[i]], "MOV C, L");
                break; 
            case 0x4e: 
                appendEmulator(i, [State8080.memory[i]], "MOV C, M");
                break; 
            case 0x4f: 
                appendEmulator(i, [State8080.memory[i]], "MOV C, A");
                break; 
            case 0x50: 
                appendEmulator(i, [State8080.memory[i]], "MOV D, B");
                break; 
            case 0x51:
                appendEmulator(i, [State8080.memory[i]], "MOV D, C"); 
                break;
            case 0x52:
                appendEmulator(i, [State8080.memory[i]], "MOV D, D"); 
                break;
            case 0x53: 
                appendEmulator(i, [State8080.memory[i]], "MOV D, E");
                break;
            case 0x54: 
                appendEmulator(i, [State8080.memory[i]], "MOV D, H");
                break;
            case 0x55: 
                appendEmulator(i, [State8080.memory[i]], "MOV D, L");
                break;
            case 0x56:
                appendEmulator(i, [State8080.memory[i]], "MOV D, M");
                break;
            case 0x57:
                appendEmulator(i, [State8080.memory[i]], "MOV D, A");
                break;
            case 0x58:
                appendEmulator(i, [State8080.memory[i]], "MOV E, B");
                break;
            case 0x59:
                appendEmulator(i, [State8080.memory[i]], "MOV E, C");
                break;
            case 0x5a:
                appendEmulator(i, [State8080.memory[i]], "MOV E, D");
                break;
            case 0x5b:
                appendEmulator(i, [State8080.memory[i]], "MOV E, E");
                break;
            case 0x5c:
                appendEmulator(i, [State8080.memory[i]], "MOV E, H");
                break;
            case 0x5d:
                appendEmulator(i, [State8080.memory[i]], "MOV E, L");
                break;
            case 0x5e:
                appendEmulator(i, [State8080.memory[i]], "MOV E, M");
                break;
            case 0x5f:
                appendEmulator(i, [State8080.memory[i]], "MOV E, A");
                break;
            case 0x60:
                appendEmulator(i, [State8080.memory[i]], "MOV H, B");
                break;
            case 0x61:
                appendEmulator(i, [State8080.memory[i]], "MOV H, C");
                break;
            case 0x62:
                appendEmulator(i, [State8080.memory[i]], "MOV H, D");
                break;
            case 0x63:
                appendEmulator(i, [State8080.memory[i]], "MOV H, E");
                break;
            case 0x64:
                appendEmulator(i, [State8080.memory[i]], "MOV H, H");
                break;
            case 0x65:
                appendEmulator(i, [State8080.memory[i]], "MOV H, L");
                break;
            case 0x66:
                appendEmulator(i, [State8080.memory[i]], "MOV H, M");
                break;
            case 0x67:
                appendEmulator(i, [State8080.memory[i]], "MOV H, A");
                break;
            case 0x68:
                appendEmulator(i, [State8080.memory[i]], "MOV L, B");
                break;
            case 0x69:
                appendEmulator(i, [State8080.memory[i]], "MOV L, C");
                break;
            case 0x6a:
                appendEmulator(i, [State8080.memory[i]], "MOV L, D");
                break;
            case 0x6b:
                appendEmulator(i, [State8080.memory[i]], "MOV L, E");
                break;
            case 0x6c:
                appendEmulator(i, [State8080.memory[i]], "MOV L, H");
                break;
            case 0x6d:
                appendEmulator(i, [State8080.memory[i]], "MOV L, L");
                break;
            case 0x6e:
                appendEmulator(i, [State8080.memory[i]], "MOV L, M");
                break;
            case 0x6f:
                appendEmulator(i, [State8080.memory[i]], "MOV L, A");
                break;
            case 0x70:
                appendEmulator(i, [State8080.memory[i]], "MOV M, B");
                break;
            case 0x71:
                appendEmulator(i, [State8080.memory[i]], "MOV M, C");
                break;
            case 0x72:
                appendEmulator(i, [State8080.memory[i]], "MOV M, D");
                break;
            case 0x73:
                appendEmulator(i, [State8080.memory[i]], "MOV M, E");
                break;
            case 0x74:
                appendEmulator(i, [State8080.memory[i]], "MOV M, H");
                break;
            case 0x75:
                appendEmulator(i, [State8080.memory[i]], "MOV M, L");
                break;
            case 0x76:
                appendEmulator(i, [State8080.memory[i]], "HLT");
                break;
            case 0x77:
                appendEmulator(i, [State8080.memory[i]], "MOV M, A");
                break;
            case 0x78:
                appendEmulator(i, [State8080.memory[i]], "MOV A, B");
                break;
            case 0x79:
                appendEmulator(i, [State8080.memory[i]], "MOV A, C");
                break;
            case 0x7a:
                appendEmulator(i, [State8080.memory[i]], "MOV A, D");
                break;
            case 0x7b:
                appendEmulator(i, [State8080.memory[i]], "MOV A, E");
                break;
            case 0x7c:
                appendEmulator(i, [State8080.memory[i]], "MOV A, H");
                break;
            case 0x7d:
                appendEmulator(i, [State8080.memory[i]], "MOV A, L");
                break;
            case 0x7e:
                appendEmulator(i, [State8080.memory[i]], "MOV A, M");
                break;
            case 0x7f:
                appendEmulator(i, [State8080.memory[i]], "MOV A, A");
                break;
            case 0x80:
                appendEmulator(i, [State8080.memory[i]], "ADD B");
                break;
            case 0x81:
                appendEmulator(i, [State8080.memory[i]], "ADD C");
                break;
            case 0x82:
                appendEmulator(i, [State8080.memory[i]], "ADD D");
                break;
            case 0x83:
                appendEmulator(i, [State8080.memory[i]], "ADD E");
                break;
            case 0x84:
                appendEmulator(i, [State8080.memory[i]], "ADD H");
                break;
            case 0x85:
                appendEmulator(i, [State8080.memory[i]], "ADD L");
                break;
            case 0x86:
                appendEmulator(i, [State8080.memory[i]], "ADD M");
                break;
            case 0x87:
                appendEmulator(i, [State8080.memory[i]], "ADD A");
                break;
            case 0x88:
                appendEmulator(i, [State8080.memory[i]], "ADC B");
                break;
            case 0x89:
                appendEmulator(i, [State8080.memory[i]], "ADC C");
                break;
            case 0x8a:
                appendEmulator(i, [State8080.memory[i]], "ADC D");
                break;
            case 0x8b:
                appendEmulator(i, [State8080.memory[i]], "ADC E");
                break;
            case 0x8c:
                appendEmulator(i, [State8080.memory[i]], "ADC H");
                break;
            case 0x8d:
                appendEmulator(i, [State8080.memory[i]], "ADC L");
                break;
            case 0x8e:
                appendEmulator(i, [State8080.memory[i]], "ADC M");
                break;
            case 0x8f:
                appendEmulator(i, [State8080.memory[i]], "ADC A");
                break;
            case 0x90:
                appendEmulator(i, [State8080.memory[i]], "SUB B");
                break;
            case 0x91:
                appendEmulator(i, [State8080.memory[i]], "SUB C");
                break;
            case 0x92:
                appendEmulator(i, [State8080.memory[i]], "SUB D");
                break;
            case 0x93:
                appendEmulator(i, [State8080.memory[i]], "SUB E");
                break;
            case 0x94:
                appendEmulator(i, [State8080.memory[i]], "SUB H");
                break;
            case 0x95:
                appendEmulator(i, [State8080.memory[i]], "SUB L");
                break;
            case 0x96:
                appendEmulator(i, [State8080.memory[i]], "SUB M");
                break;
            case 0x97:
                appendEmulator(i, [State8080.memory[i]], "SUB A");
                break;
            case 0x98:
                appendEmulator(i, [State8080.memory[i]], "SBB B");
                break;
            case 0x99:
                appendEmulator(i, [State8080.memory[i]], "SBB C");
                break;
            case 0x9a:
                appendEmulator(i, [State8080.memory[i]], "SBB D");
                break;
            case 0x9b:
                appendEmulator(i, [State8080.memory[i]], "SBB E");
                break;
            case 0x9c:
                appendEmulator(i, [State8080.memory[i]], "SBB H");
                break;
            case 0x9d:
                appendEmulator(i, [State8080.memory[i]], "SBB L");
                break;
            case 0x9e:
                appendEmulator(i, [State8080.memory[i]], "SBB M");
                break;
            case 0x9f:
                appendEmulator(i, [State8080.memory[i]], "SBB A");
                break;
            case 0xa0:
                appendEmulator(i, [State8080.memory[i]], "ANA B");
                break;
            case 0xa1:
                appendEmulator(i, [State8080.memory[i]], "ANA C");
                break;
            case 0xa2:
                appendEmulator(i, [State8080.memory[i]], "ANA D");
                break;
            case 0xa3:
                appendEmulator(i, [State8080.memory[i]], "ANA E");
                break;
            case 0xa4:
                appendEmulator(i, [State8080.memory[i]], "ANA H");
                break;
            case 0xa5:
                appendEmulator(i, [State8080.memory[i]], "ANA L");
                break;
            case 0xa6:
                appendEmulator(i, [State8080.memory[i]], "ANA M");
                break;
            case 0xa7:
                appendEmulator(i, [State8080.memory[i]], "ANA A");
                break;
            case 0xa8:
                appendEmulator(i, [State8080.memory[i]], "XRA B");
                break;
            case 0xa9:
                appendEmulator(i, [State8080.memory[i]], "XRA C");
                break;
            case 0xaa:
                appendEmulator(i, [State8080.memory[i]], "XRA D");
                break;
            case 0xab:
                appendEmulator(i, [State8080.memory[i]], "XRA E");
                break;
            case 0xac:
                appendEmulator(i, [State8080.memory[i]], "XRA H");
                break;
            case 0xad:
                appendEmulator(i, [State8080.memory[i]], "XRA L");
                break;
            case 0xae:
                appendEmulator(i, [State8080.memory[i]], "XRA M");
                break;
            case 0xaf:
                appendEmulator(i, [State8080.memory[i]], "XRA A");
                break;
            case 0xb0:
                appendEmulator(i, [State8080.memory[i]], "ORA B");
                break;
            case 0xb1:
                appendEmulator(i, [State8080.memory[i]], "ORA C");
                break;
            case 0xb2:
                appendEmulator(i, [State8080.memory[i]], "ORA D");
                break;
            case 0xb3:
                appendEmulator(i, [State8080.memory[i]], "ORA E");
                break;
            case 0xb4:
                appendEmulator(i, [State8080.memory[i]], "ORA H");
                break;
            case 0xb5:
                appendEmulator(i, [State8080.memory[i]], "ORA L");
                break;
            case 0xb6:
                appendEmulator(i, [State8080.memory[i]], "ORA M");
                break;
            case 0xb7:
                appendEmulator(i, [State8080.memory[i]], "ORA A");
                break;
            case 0xb8:
                appendEmulator(i, [State8080.memory[i]], "CMP B");
                break;
            case 0xb9:
                appendEmulator(i, [State8080.memory[i]], "CMP C");
                break;
            case 0xba:
                appendEmulator(i, [State8080.memory[i]], "CMP D");
                break;
            case 0xbb:
                appendEmulator(i, [State8080.memory[i]], "CMP E");
                break;
            case 0xbc:
                appendEmulator(i, [State8080.memory[i]], "CMP H");
                break;
            case 0xbd:
                appendEmulator(i, [State8080.memory[i]], "CMP L");
                break;
            case 0xbe:
                appendEmulator(i, [State8080.memory[i]], "CMP M");
                break;
            case 0xbf:
                appendEmulator(i, [State8080.memory[i]], "CMP A");
                break;
            case 0xc0:
                appendEmulator(i, [State8080.memory[i]], "RNZ");
                break;
            case 0xc1:
                appendEmulator(i, [State8080.memory[i]], "POP B");
                break;
            case 0xc2:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "JNZ " + toHexa(State8080.memory[i+2]) + toHexa(State8080.memory[i+1]));
                i+= 2;
                break;
            case 0xc3:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "JMP " + toHexa(State8080.memory[i+2]) + toHexa(State8080.memory[i+1]));
                i+= 2;
                break;
            case 0xc4:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "CNZ " + toHexa(State8080.memory[i+2]) + toHexa(State8080.memory[i+1]));
                i+= 2;
                break;
            case 0xc5:
                appendEmulator(i, [State8080.memory[i]], "PUSH B");
                break;
            case 0xc6:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1]], "ADI D8");
                i++;
                break;
            case 0xc7:
                appendEmulator(i, [State8080.memory[i]], "RST 0");
                break;
            case 0xc8:
                appendEmulator(i, [State8080.memory[i]], "RZ");
                break;
            case 0xc9:
                appendEmulator(i, [State8080.memory[i]], "RET");
                break;
            case 0xca:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "JZ " + toHexa(State8080.memory[i+2]) + toHexa(State8080.memory[i+1]));
                i+= 2;
                break;
            case 0xcc:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "CZ " + toHexa(State8080.memory[i+2]) + toHexa(State8080.memory[i+1]));
                i+= 2;
                break;
            case 0xcd:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "CALL " + toHexa(State8080.memory[i+2]) + toHexa(State8080.memory[i+1]));
                i+= 2;
                break;
            case 0xce:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1]], "ACI D8");
                i++;
                break;
            case 0xcf:
                appendEmulator(i, [State8080.memory[i]], "RST 1");
                break;
            case 0xd0:
                appendEmulator(i, [State8080.memory[i]], "RNC");
                break;
            case 0xd1:
                appendEmulator(i, [State8080.memory[i]], "POP D");
                break;
            case 0xd2:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "JNC " + toHexa(State8080.memory[i+2]) + toHexa(State8080.memory[i+1]));
                i+= 2;
                break;
            case 0xd3:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1]], "OUT D8");
                i++;
                break;
            case 0xd4:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "CNC " + toHexa(State8080.memory[i+2]) + toHexa(State8080.memory[i+1]));
                i+= 2;
                break;
            case 0xd5:
                appendEmulator(i, [State8080.memory[i]], "PUSH D");
                break;
            case 0xd6:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1]], "SUI D8");
                i++;
                break;
            case 0xd7:
                appendEmulator(i, [State8080.memory[i]], "RST 2");
                break;
            case 0xd8:
                appendEmulator(i, [State8080.memory[i]], "RC");
                break;
            case 0xda:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "JC " + toHexa(State8080.memory[i+2]) + toHexa(State8080.memory[i+1]));
                i+= 2;
                break;
            case 0xdb:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1]], "IN D8");
                i++;
                break;
            case 0xdc:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "CC " + toHexa(State8080.memory[i+2]) + toHexa(State8080.memory[i+1]));
                i+= 2;
                break;
            case 0xde:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1]], "SBI D8");
                i++;
                break;
            case 0xdf:
                appendEmulator(i, [State8080.memory[i]], "RST 3");
                break;
            case 0xe0:
                appendEmulator(i, [State8080.memory[i]], "RPO");
                break;
            case 0xe1:
                appendEmulator(i, [State8080.memory[i]], "POP H");
                break;
            case 0xe2:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "JPO " + toHexa(State8080.memory[i+2]) + toHexa(State8080.memory[i+1]));
                i+= 2;
                break;
            case 0xe3:
                appendEmulator(i, [State8080.memory[i]], "XTHL");
                break;
            case 0xe4:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "CPO " + toHexa(State8080.memory[i+2]) + toHexa(State8080.memory[i+1]));
                i+= 2;
                break;
            case 0xe5:
                appendEmulator(i, [State8080.memory[i]], "PUSH H");
                break;
            case 0xe6:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1]], "ANI D8");
                i++;
                break;
            case 0xe7:
                appendEmulator(i, [State8080.memory[i]], "RST 4");
                break;
            case 0xe8:
                appendEmulator(i, [State8080.memory[i]], "RPE");
                break;
            case 0xe9:
                appendEmulator(i, [State8080.memory[i]], "PCHL");
                break;
            case 0xea:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "JPE " + toHexa(State8080.memory[i+2]) + toHexa(State8080.memory[i+1]));
                i+= 2;
                break;
            case 0xeb:
                appendEmulator(i, [State8080.memory[i]], "XCHG");
                break;
            case 0xec:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "CPE " + toHexa(State8080.memory[i+2]) + toHexa(State8080.memory[i+1]));
                i+= 2;
                break;
            case 0xee:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1]], "XRI D8");
                i++;
                break;
            case 0xef:
                appendEmulator(i, [State8080.memory[i]], "RST 5");
                break;
            case 0xf0:
                appendEmulator(i, [State8080.memory[i]], "RP");
                break;
            case 0xf1:
                appendEmulator(i, [State8080.memory[i]], "POP PSW");
                break;
            case 0xf2:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "JP " + toHexa(State8080.memory[i+2]) + toHexa(State8080.memory[i+1] ));
                i+= 2;
                break;
            case 0xf3:
                appendEmulator(i, [State8080.memory[i]], "DI");
                break;
            case 0xf4:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "CP " + toHexa(State8080.memory[i+2]) + toHexa(State8080.memory[i+1]));
                i+= 2;
                break;
            case 0xf5:
                appendEmulator(i, [State8080.memory[i]], "PUSH PSW");
                break;
            case 0xf6:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1]], "ORI D8");
                i++;
                break;
            case 0xf7:
                appendEmulator(i, [State8080.memory[i]], "RST 6");
                break;
            case 0xf8:
                appendEmulator(i, [State8080.memory[i]], "RM");
                break;
            case 0xf9:
                appendEmulator(i, [State8080.memory[i]], "SPHL");
                break;
            case 0xfa:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "JM " + toHexa(State8080.memory[i+2]) + toHexa(State8080.memory[i+1] ));
                i+= 2;
                break;
            case 0xfb:
                appendEmulator(i, [State8080.memory[i]], "EI");
                break;
            case 0xfc:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1], State8080.memory[i+2]], "CM " + toHexa(State8080.memory[i+2]) + toHexa(State8080.memory[i+1] ));
                i+= 2;
                break;
            case 0xfe:
                appendEmulator(i, [State8080.memory[i], State8080.memory[i+1]], "CPI D8");
                i++;
                break;
            case 0xff:
                appendEmulator(i, [State8080.memory[i]], "RST 7");
                break;
            default:
                appendEmulator(i, [State8080.memory[i]], "UNDEFINED");
                break;
        }
    }
}


/**
 * Emulates the 8080 microprocessor
 */
function emulator8080(){
    if (State8080.memory == null){
        State8080.memory = new Uint8Array(fileBuffer);
    }
    for (; State8080.pc < State8080.memory.length; State8080.pc++){
        console.log(State8080.pc);
        console.log(State8080.pc);
        switch(State8080.memory[State8080.pc]){
            case 0x08:
            case 0x10:
            case 0x18:
            case 0xd9:
            case 0xdd:
            case 0xed:
            case 0xfc:
            case 0xcb:
            case 0xfd:
                break;
            case 0x00:
                appendLog( State8080.pc.toString(16) + " | " + "NOP");
                break;
            case 0x01:
                appendLog( State8080.pc.toString(16) + " | " + "LXI B, D16");
                State8080.b = State8080.memory[State8080.pc+2];
                State8080.c = State8080.memory[State8080.pc+1];
                State8080.pc+=2;
                break;
            case 0x02:
                appendLog( State8080.pc.toString(16) + " | " + "STAX B");
                break;
            case 0x03:
                appendLog( State8080.pc.toString(16) + " | " + "INX B");
                break;
            case 0x04:
                appendLog( State8080.pc.toString(16) + " | " + "INR B");
                break;
            case 0x05:
                appendLog( State8080.pc.toString(16) + " | " + "DCR B");
                break;
            case 0x06:
                appendLog( State8080.pc.toString(16) + " | " + "MVI B, D8");
                State8080.pc++;
                break;
            case 0x07:
                appendLog( State8080.pc.toString(16) + " | " + "RLC");
                break;
            case 0x09:
                appendLog( State8080.pc.toString(16) + " | " + "DAD B");
                break;
            case 0x0a:
                appendLog( State8080.pc.toString(16) + " | " + "LDAX B");
                break;
            case 0x0b:
                appendLog( State8080.pc.toString(16) + " | " + "DCX B");
                break;
            case 0x0c:
                appendLog( State8080.pc.toString(16) + " | " + "INR C");
                break;
            case 0x0d:
                appendLog( State8080.pc.toString(16) + " | " + "DCR C");
                break;
            case 0x0e:
                appendLog( State8080.pc.toString(16) + " | " + "MVI C, D8");
                State8080.pc++;
                break;
            case 0x0f:
                appendLog( State8080.pc.toString(16) + " | " + "RRC");
                break;
            case 0x11:
                appendLog( State8080.pc.toString(16) + " | " + "LXI D, D16");
                State8080.pc+= 2;
                break;
            case 0x12:
                appendLog( State8080.pc.toString(16) + " | " + "STAX D");
                break;
            case 0x13:
                appendLog( State8080.pc.toString(16) + " | " + "INX D");
                break;
            case 0x14:
                appendLog( State8080.pc.toString(16) + " | " + "INR D");
                break;
            case 0x15:
                appendLog( State8080.pc.toString(16) + " | " + "DCR D");
                break;
            case 0x16:
                appendLog( State8080.pc.toString(16) + " | " + "MVI D, D8");
                State8080.pc++;
                break;
            case 0x17:
                appendLog( State8080.pc.toString(16) + " | " + "RAL");
                break;
            case 0x19:
                appendLog( State8080.pc.toString(16) + " | " + "DAD D");
                break;
            case 0x1a:
                appendLog( State8080.pc.toString(16) + " | " + "LDAX D");
                break;
            case 0x1b:
                appendLog( State8080.pc.toString(16) + " | " + "DCX D");
                break;
            case 0x1c:
                appendLog( State8080.pc.toString(16) + " | " + "INR E");
                break;
            case 0x1d:
                appendLog( State8080.pc.toString(16) + " | " + "DCR E");
                break;
            case 0x1e:
                appendLog( State8080.pc.toString(16) + " | " + "MVI E, D8");
                State8080.pc++;
                break;
            case 0x1f:
                appendLog( State8080.pc.toString(16) + " | " + "RAR");
                break;
            case 0x20:
                appendLog( State8080.pc.toString(16) + " | " + "RIM");
                break;
            case 0x21:
                appendLog( State8080.pc.toString(16) + " | " + "LXI H, D16");
                State8080.pc+= 2;
                break;
            case 0x22:
                appendLog( State8080.pc.toString(16) + " | " + "SHLD " + toHexa(State8080.memory[State8080.pc+2]) + toHexa(State8080.memory[State8080.pc+1] ));
                State8080.pc+= 2;
                break;
            case 0x23:
                appendLog( State8080.pc.toString(16) + " | " + "INX H");
                break;
            case 0x24:
                appendLog( State8080.pc.toString(16) + " | " + "INR H");
                break;
            case 0x25:
                appendLog( State8080.pc.toString(16) + " | " + "DCR H");
                break;
            case 0x26:
                appendLog( State8080.pc.toString(16) + " | " + "MVI H, D8");
                State8080.pc++;
                break;
            case 0x27:
                appendLog( State8080.pc.toString(16) + " | " + "DAA");
                break;
            case 0x29:
                appendLog( State8080.pc.toString(16) + " | " + "DAD H");
                break;
            case 0x2a:
                appendLog( State8080.pc.toString(16) + " | " + "LHLD " + toHexa(State8080.memory[State8080.pc+2]) + toHexa(State8080.memory[State8080.pc+1] ));
                State8080.pc+= 2;
                break;
            case 0x2b:
                appendLog( State8080.pc.toString(16) + " | " + "DCX H");
                break;
            case 0x2c:
                appendLog( State8080.pc.toString(16) + " | " + "INR L");
                break;
            case 0x2d:
                appendLog( State8080.pc.toString(16) + " | " + "DCR L");
                break;
            case 0x2e:
                appendLog( State8080.pc.toString(16) + " | " + "MVI L, D8");
                State8080.pc++;
                break;
            case 0x2f:
                appendLog( State8080.pc.toString(16) + " | " + "CMA");
                break;
            case 0x31:
                appendLog( State8080.pc.toString(16) + " | " + "LXI SP, D16");
                State8080.pc+= 2;
                break;
            case 0x32:
                appendLog( State8080.pc.toString(16) + " | " + "STA " + toHexa(State8080.memory[State8080.pc+2]) + toHexa(State8080.memory[State8080.pc+1] ));
                State8080.pc+= 2;
                break;
            case 0x33:
                appendLog( State8080.pc.toString(16) + " | " + "INX SP");
                break;
            case 0x34:
                appendLog( State8080.pc.toString(16) + " | " + "INR M");
                break;
            case 0x35:
                appendLog( State8080.pc.toString(16) + " | " + "DCR M");
                break;
            case 0x36:
                appendLog( State8080.pc.toString(16) + " | " + "MVI M,D8");
                State8080.pc++;
                break;
            case 0x37:
                appendLog( State8080.pc.toString(16) + " | " + "STC");
                break;
            case 0x39:
                appendLog( State8080.pc.toString(16) + " | " + "DAD SP");
                break;
            case 0x3a:
                appendLog( State8080.pc.toString(16) + " | " + "LDA " + toHexa(State8080.memory[State8080.pc+2]) + toHexa(State8080.memory[State8080.pc+1] ));
                State8080.pc+= 2;
                break;
            case 0x3b:
                appendLog( State8080.pc.toString(16) + " | " + "DCX SP");
                break;
            case 0x3c:
                appendLog( State8080.pc.toString(16) + " | " + "INR A");
                break;
            case 0x3d:
                appendLog( State8080.pc.toString(16) + " | " + "DCR A");
                break;
            case 0x3e:
                appendLog( State8080.pc.toString(16) + " | " + "MVI A,D8");
                State8080.pc++;
                break;
            case 0x3f:
                appendLog( State8080.pc.toString(16) + " | " + "CMC");
                break;
            case 0x40:
                appendLog( State8080.pc.toString(16) + " | " + "MOV B, B");
                State8080.b = State8080.b;
                break; 
            case 0x41: 
                appendLog( State8080.pc.toString(16) + " | " + "MOV B, C");
                State8080.b = State8080.c;
                break; 
            case 0x42: 
                appendLog( State8080.pc.toString(16) + " | " + "MOV B, D");
                State8080.b = State8080.d;
                break; 
            case 0x43: 
                appendLog( State8080.pc.toString(16) + " | " + "MOV B, E");
                State8080.b = State8080.e;
                break; 
            case 0x44: 
                appendLog( State8080.pc.toString(16) + " | " + "MOV B, H");
                State8080.b = State8080.h;
                break; 
            case 0x45: 
                appendLog( State8080.pc.toString(16) + " | " + "MOV B, L");
                State8080.b = State8080.l;
                break; 
            case 0x46: 
                appendLog( State8080.pc.toString(16) + " | " + "MOV B, M");
                break; 
            case 0x47: 
                appendLog( State8080.pc.toString(16) + " | " + "MOV B, A");
                State8080.b = State8080.a;
                break; 
            case 0x48: 
                appendLog( State8080.pc.toString(16) + " | " + "MOV C, B");
                State8080.c = State8080.b;
                break; 
            case 0x49: 
                appendLog( State8080.pc.toString(16) + " | " + "MOV C, C");
                State8080.c = State8080.c;
                break; 
            case 0x4a: 
                appendLog( State8080.pc.toString(16) + " | " + "MOV C, D");
                State8080.c = State8080.d;
                break; 
            case 0x4b: 
                appendLog( State8080.pc.toString(16) + " | " + "MOV C, E");
                State8080.c = State8080.e;
                break; 
            case 0x4c: 
                appendLog( State8080.pc.toString(16) + " | " + "MOV C, H");
                State8080.c = State8080.h;
                break; 
            case 0x4d: 
                appendLog( State8080.pc.toString(16) + " | " + "MOV C, L");
                State8080.c = State8080.l;
                break; 
            case 0x4e: 
                appendLog( State8080.pc.toString(16) + " | " + "MOV C, M");
                break; 
            case 0x4f: 
                appendLog( State8080.pc.toString(16) + " | " + "MOV C, A");
                State8080.c = State8080.a;
                break; 
            case 0x50: 
                appendLog( State8080.pc.toString(16) + " | " + "MOV D, B");
                State8080.d = State8080.b;
                break; 
            case 0x51: 
                appendLog( State8080.pc.toString(16) + " | " + "MOV D, C");
                State8080.d = State8080.c;
                break;
            case 0x52: 
                appendLog( State8080.pc.toString(16) + " | " + "MOV D, D");
                State8080.d = State8080.d;
                break;
            case 0x53: 
                appendLog( State8080.pc.toString(16) + " | " + "MOV D, E");
                State8080.d = State8080.e;
                break;
            case 0x54: 
                appendLog( State8080.pc.toString(16) + " | " + "MOV D, H");
                State8080.d = State8080.h;
                break;
            case 0x55: 
                appendLog( State8080.pc.toString(16) + " | " + "MOV D, L");
                State8080.d = State8080.l;
                break;
            case 0x56:
                appendLog( State8080.pc.toString(16) + " | " + "MOV D, M");
                break;
            case 0x57:
                appendLog( State8080.pc.toString(16) + " | " + "MOV D, A");
                State8080.d = State8080.a;
                break;
            case 0x58:
                appendLog( State8080.pc.toString(16) + " | " + "MOV E, B");
                State8080.e = State8080.b;
                break;
            case 0x59:
                appendLog( State8080.pc.toString(16) + " | " + "MOV E, C");
                State8080.e = State8080.c;
                break;
            case 0x5a:
                appendLog( State8080.pc.toString(16) + " | " + "MOV E, D");
                State8080.e = State8080.d;
                break;
            case 0x5b:
                appendLog( State8080.pc.toString(16) + " | " + "MOV E, E");
                State8080.e = State8080.e;
                break;
            case 0x5c:
                appendLog( State8080.pc.toString(16) + " | " + "MOV E, H");
                State8080.e = State8080.h;
                break;
            case 0x5d:
                appendLog( State8080.pc.toString(16) + " | " + "MOV E, L");
                State8080.e = State8080.l;
                break;
            case 0x5e:
                appendLog( State8080.pc.toString(16) + " | " + "MOV E, M");
                break;
            case 0x5f:
                appendLog( State8080.pc.toString(16) + " | " + "MOV E, A");
                State8080.e = State8080.a;
                break;
            case 0x60:
                appendLog( State8080.pc.toString(16) + " | " + "MOV H, B");
                State8080.h = State8080.b;
                break;
            case 0x61:
                appendLog( State8080.pc.toString(16) + " | " + "MOV H, C");
                State8080.h = State8080.c;
                break;
            case 0x62:
                appendLog( State8080.pc.toString(16) + " | " + "MOV H, D");
                State8080.h = State8080.d;
                break;
            case 0x63:
                appendLog( State8080.pc.toString(16) + " | " + "MOV H, E");
                State8080.h = State8080.e;
                break;
            case 0x64:
                appendLog( State8080.pc.toString(16) + " | " + "MOV H, H");
                State8080.h = State8080.h;
                break;
            case 0x65:
                appendLog( State8080.pc.toString(16) + " | " + "MOV H, L");
                State8080.h = State8080.l;
                break;
            case 0x66:
                appendLog( State8080.pc.toString(16) + " | " + "MOV H, M");
                break;
            case 0x67:
                appendLog( State8080.pc.toString(16) + " | " + "MOV H, A");
                State8080.h = State8080.a;
                break;
            case 0x68:
                appendLog( State8080.pc.toString(16) + " | " + "MOV L, B");
                State8080.l = State8080.b;
                break;
            case 0x69:
                appendLog( State8080.pc.toString(16) + " | " + "MOV L, C");
                State8080.l = State8080.c;
                break;
            case 0x6a:
                appendLog( State8080.pc.toString(16) + " | " + "MOV L, D");
                State8080.l = State8080.d;
                break;
            case 0x6b:
                appendLog( State8080.pc.toString(16) + " | " + "MOV L, E");
                State8080.l = State8080.e;
                break;
            case 0x6c:
                appendLog( State8080.pc.toString(16) + " | " + "MOV L, H");
                State8080.l = State8080.h;
                break;
            case 0x6d:
                appendLog( State8080.pc.toString(16) + " | " + "MOV L, L");
                State8080.l = State8080.l;
                break;
            case 0x6e:
                appendLog( State8080.pc.toString(16) + " | " + "MOV L, M");
                break;
            case 0x6f:
                appendLog( State8080.pc.toString(16) + " | " + "MOV L, A");
                State8080.l = State8080.a;
                break;
            case 0x70:
                appendLog( State8080.pc.toString(16) + " | " + "MOV M, B");
                break;
            case 0x71:
                appendLog( State8080.pc.toString(16) + " | " + "MOV M, C");
                break;
            case 0x72:
                appendLog( State8080.pc.toString(16) + " | " + "MOV M, D");
                break;
            case 0x73:
                appendLog( State8080.pc.toString(16) + " | " + "MOV M, E");
                break;
            case 0x74:
                appendLog( State8080.pc.toString(16) + " | " + "MOV M, H");
                break;
            case 0x75:
                appendLog( State8080.pc.toString(16) + " | " + "MOV M, L");
                break;
            case 0x76:
                appendLog( State8080.pc.toString(16) + " | " + "HLT");
                break;
            case 0x77:
                appendLog( State8080.pc.toString(16) + " | " + "MOV M, A");
                break;
            case 0x78:
                appendLog( State8080.pc.toString(16) + " | " + "MOV A, B");
                State8080.a = State8080.b;
                break;
            case 0x79:
                appendLog( State8080.pc.toString(16) + " | " + "MOV A, C");
                State8080.a = State8080.c;
                break;
            case 0x7a:
                appendLog( State8080.pc.toString(16) + " | " + "MOV A, D");
                State8080.a = State8080.d;
                break;
            case 0x7b:
                appendLog( State8080.pc.toString(16) + " | " + "MOV A, E");
                State8080.a = State8080.e;
                break;
            case 0x7c:
                appendLog( State8080.pc.toString(16) + " | " + "MOV A, H");
                State8080.a = State8080.h;
                break;
            case 0x7d:
                appendLog( State8080.pc.toString(16) + " | " + "MOV A, L");
                State8080.a = State8080.l;
                break;
            case 0x7e:
                appendLog( State8080.pc.toString(16) + " | " + "MOV A, M");
                break;
            case 0x7f:
                appendLog( State8080.pc.toString(16) + " | " + "MOV A, A");
                State8080.a = State8080.a;
                break;
            case 0x80:
                appendLog( State8080.pc.toString(16) + " | " + "ADD B");
                State8080.a += State8080.b;
                setFlags(State8080.a);
                break;
            case 0x81:
                appendLog( State8080.pc.toString(16) + " | " + "ADD C");
                State8080.a += State8080.c;
                setFlags(State8080.a);
                break;
            case 0x82:
                appendLog( State8080.pc.toString(16) + " | " + "ADD D");
                State8080.a += State8080.d;
                setFlags(State8080.a);
                break;
            case 0x83:
                appendLog( State8080.pc.toString(16) + " | " + "ADD E");
                State8080.a += State8080.e;
                setFlags(State8080.a);
                break;
            case 0x84:
                appendLog( State8080.pc.toString(16) + " | " + "ADD H");
                State8080.a += State8080.h;
                setFlags(State8080.a);
                break;
            case 0x85:
                appendLog( State8080.pc.toString(16) + " | " + "ADD L");
                State8080.a += State8080.l;
                setFlags(State8080.a);
                break;
            case 0x86:
                appendLog( State8080.pc.toString(16) + " | " + "ADD M");
                break;
            case 0x87:
                appendLog( State8080.pc.toString(16) + " | " + "ADD A");
                State8080.a += State8080.a;
                setFlags(State8080.a);
                break;
            case 0x88:
                appendLog( State8080.pc.toString(16) + " | " + "ADC B");
                State8080.a += State8080.b + State8080.cc.CY;
                setFlags(State8080.a);
                break;
            case 0x89:
                appendLog( State8080.pc.toString(16) + " | " + "ADC C");
                State8080.a += State8080.c + State8080.cc.CY;
                setFlags(State8080.a);
                break;
            case 0x8a:
                appendLog( State8080.pc.toString(16) + " | " + "ADC D");
                State8080.a += State8080.d + State8080.cc.CY;
                setFlags(State8080.a);
                break;
            case 0x8b:
                appendLog( State8080.pc.toString(16) + " | " + "ADC E");
                State8080.a += State8080.e + State8080.cc.CY;
                setFlags(State8080.a);
                break;
            case 0x8c:
                appendLog( State8080.pc.toString(16) + " | " + "ADC H");
                State8080.a += State8080.h + State8080.cc.CY;
                setFlags(State8080.a);
                break;
            case 0x8d:
                appendLog( State8080.pc.toString(16) + " | " + "ADC L");
                State8080.a += State8080.l + State8080.cc.CY;
                setFlags(State8080.a);
                break;
            case 0x8e:
                appendLog( State8080.pc.toString(16) + " | " + "ADC M");
                break;
            case 0x8f:
                appendLog( State8080.pc.toString(16) + " | " + "ADC A");
                State8080.a += State8080.a + State8080.cc.CY;
                setFlags(State8080.a);
                break;
            case 0x90:
                appendLog( State8080.pc.toString(16) + " | " + "SUB B");
                State8080.a -= State8080.b;
                setFlags(State8080.a);
                break;
            case 0x91:
                appendLog( State8080.pc.toString(16) + " | " + "SUB C");
                State8080.a -= State8080.c;
                setFlags(State8080.a);
                break;
            case 0x92:
                appendLog( State8080.pc.toString(16) + " | " + "SUB D");
                State8080.a -= State8080.d;
                setFlags(State8080.a);
                break;
            case 0x93:
                appendLog( State8080.pc.toString(16) + " | " + "SUB E");
                State8080.a -= State8080.e;
                setFlags(State8080.a);
                break;
            case 0x94:
                appendLog( State8080.pc.toString(16) + " | " + "SUB H");
                State8080.a -= State8080.h;
                setFlags(State8080.a);
                break;
            case 0x95:
                appendLog( State8080.pc.toString(16) + " | " + "SUB L");
                State8080.a -= State8080.l;
                setFlags(State8080.a);
                break;
            case 0x96:
                appendLog( State8080.pc.toString(16) + " | " + "SUB M");
                break;
            case 0x97:
                appendLog( State8080.pc.toString(16) + " | " + "SUB A");
                State8080.a -= State8080.a;
                setFlags(State8080.a);
                break;
            case 0x98:
                appendLog( State8080.pc.toString(16) + " | " + "SBB B");
                State8080.a += twoComplement(State8080.b + State8080.cc.CY);
                setFlags(State8080.a);
                break;
            case 0x99:
                appendLog( State8080.pc.toString(16) + " | " + "SBB C");
                State8080.a += twoComplement(State8080.c + State8080.cc.CY);
                setFlags(State8080.a);
                break;
            case 0x9a:
                appendLog( State8080.pc.toString(16) + " | " + "SBB D");
                State8080.a += twoComplement(State8080.d + State8080.cc.CY);
                setFlags(State8080.a);
                break;
            case 0x9b:
                appendLog( State8080.pc.toString(16) + " | " + "SBB E");
                State8080.a += twoComplement(State8080.e + State8080.cc.CY);
                setFlags(State8080.a);
                break;
            case 0x9c:
                appendLog( State8080.pc.toString(16) + " | " + "SBB H");
                State8080.a += twoComplement(State8080.h + State8080.cc.CY);
                setFlags(State8080.a);
                break;
            case 0x9d:
                appendLog( State8080.pc.toString(16) + " | " + "SBB L");
                State8080.a += twoComplement(State8080.l + State8080.cc.CY);
                setFlags(State8080.a);
                break;
            case 0x9e:
                appendLog( State8080.pc.toString(16) + " | " + "SBB M");
                break;
            case 0x9f:
                appendLog( State8080.pc.toString(16) + " | " + "SBB A");
                State8080.a += twoComplement(State8080.a + State8080.cc.CY);
                setFlags(State8080.a);
                break;
            case 0xa0:
                appendLog( State8080.pc.toString(16) + " | " + "ANA B");
                State8080.a &= State8080.b;
                setFlags(State8080.a);
                State8080.cc.CY = 0;
                break;
            case 0xa1:
                appendLog( State8080.pc.toString(16) + " | " + "ANA C");
                State8080.a &= State8080.c;
                setFlags(State8080.a);
                State8080.cc.CY = 0;
                break;
            case 0xa2:
                appendLog( State8080.pc.toString(16) + " | " + "ANA D");
                State8080.a &= State8080.d;
                setFlags(State8080.a);
                State8080.cc.CY = 0;
                break;
            case 0xa3:
                appendLog( State8080.pc.toString(16) + " | " + "ANA E");
                State8080.a &= State8080.e;
                setFlags(State8080.a);
                State8080.cc.CY = 0;
                break;
            case 0xa4:
                appendLog( State8080.pc.toString(16) + " | " + "ANA H");
                State8080.a &= State8080.h;
                setFlags(State8080.a);
                State8080.cc.CY = 0;
                break;
            case 0xa5:
                appendLog( State8080.pc.toString(16) + " | " + "ANA L");
                State8080.a &= State8080.l;
                setFlags(State8080.a);
                State8080.cc.CY = 0;
                break;
            case 0xa6:
                appendLog( State8080.pc.toString(16) + " | " + "ANA M");
                break;
            case 0xa7:
                appendLog( State8080.pc.toString(16) + " | " + "ANA A");
                State8080.a &= State8080.a;
                setFlags(State8080.a);
                State8080.cc.CY = 0;
                break;
            case 0xa8:
                appendLog( State8080.pc.toString(16) + " | " + "XRA B");
                State8080.a ^= State8080.b;
                setFlags(State8080.a);
                State8080.cc.CY = 0;
                State8080.cc.AC = 0;
                break;
            case 0xa9:
                appendLog( State8080.pc.toString(16) + " | " + "XRA C");
                State8080.a ^= State8080.c;
                setFlags(State8080.a);
                State8080.cc.CY = 0;
                State8080.cc.AC = 0;
                break;
            case 0xaa:
                appendLog( State8080.pc.toString(16) + " | " + "XRA D");
                State8080.a ^= State8080.d;
                setFlags(State8080.a);
                State8080.cc.CY = 0;
                State8080.cc.AC = 0;
                break;
            case 0xab:
                appendLog( State8080.pc.toString(16) + " | " + "XRA E");
                State8080.a ^= State8080.e;
                setFlags(State8080.a);
                State8080.cc.CY = 0;
                State8080.cc.AC = 0;
                break;
            case 0xac:
                appendLog( State8080.pc.toString(16) + " | " + "XRA H");
                State8080.a ^= State8080.h;
                setFlags(State8080.a);
                State8080.cc.CY = 0;
                State8080.cc.AC = 0;
                break;
            case 0xad:
                appendLog( State8080.pc.toString(16) + " | " + "XRA L");
                State8080.a ^= State8080.l;
                setFlags(State8080.a);
                State8080.cc.CY = 0;
                State8080.cc.AC = 0;
                break;
            case 0xae:
                appendLog( State8080.pc.toString(16) + " | " + "XRA M");
                break;
            case 0xaf:
                appendLog( State8080.pc.toString(16) + " | " + "XRA A");
                State8080.a ^= State8080.a;
                setFlags(State8080.a);
                State8080.cc.CY = 0;
                State8080.cc.AC = 0;
                break;
            case 0xb0:
                appendLog( State8080.pc.toString(16) + " | " + "ORA B");
                State8080.a |= State8080.b;
                setFlags(State8080.a);
                State8080.cc.CY = 0;
                State8080.cc.AC = 0;
                break;
            case 0xb1:
                appendLog( State8080.pc.toString(16) + " | " + "ORA C");
                State8080.a |= State8080.c;
                setFlags(State8080.a);
                State8080.cc.CY = 0;
                State8080.cc.AC = 0;
                break;
            case 0xb2:
                appendLog( State8080.pc.toString(16) + " | " + "ORA D");
                State8080.a |= State8080.d;
                setFlags(State8080.a);
                State8080.cc.CY = 0;
                State8080.cc.AC = 0;
                break;
            case 0xb3:
                appendLog( State8080.pc.toString(16) + " | " + "ORA E");
                State8080.a |= State8080.e;
                setFlags(State8080.a);
                State8080.cc.CY = 0;
                State8080.cc.AC = 0;
                break;
            case 0xb4:
                appendLog( State8080.pc.toString(16) + " | " + "ORA H");
                State8080.a |= State8080.h;
                setFlags(State8080.a);
                State8080.cc.CY = 0;
                State8080.cc.AC = 0;
                break;
            case 0xb5:
                appendLog( State8080.pc.toString(16) + " | " + "ORA L");
                State8080.a |= State8080.l;
                setFlags(State8080.a);
                State8080.cc.CY = 0;
                State8080.cc.AC = 0;
                break;
            case 0xb6:
                appendLog( State8080.pc.toString(16) + " | " + "ORA M");
                break;
            case 0xb7:
                appendLog( State8080.pc.toString(16) + " | " + "ORA A");
                State8080.a |= State8080.a;
                setFlags(State8080.a);
                State8080.cc.CY = 0;
                State8080.cc.AC = 0;
                break;
            case 0xb8:
                appendLog( State8080.pc.toString(16) + " | " + "CMP B");
                break;
            case 0xb9:
                appendLog( State8080.pc.toString(16) + " | " + "CMP C");
                break;
            case 0xba:
                appendLog( State8080.pc.toString(16) + " | " + "CMP D");
                break;
            case 0xbb:
                appendLog( State8080.pc.toString(16) + " | " + "CMP E");
                break;
            case 0xbc:
                appendLog( State8080.pc.toString(16) + " | " + "CMP H");
                break;
            case 0xbd:
                appendLog( State8080.pc.toString(16) + " | " + "CMP L");
                break;
            case 0xbe:
                appendLog( State8080.pc.toString(16) + " | " + "CMP M");
                break;
            case 0xbf:
                appendLog( State8080.pc.toString(16) + " | " + "CMP A");
                break;
            case 0xc0:
                appendLog( State8080.pc.toString(16) + " | " + "RNZ");
                if (State8080.cc.Z == 0){
                    State8080.pc = pop();
                }
                break;
            case 0xc1:
                appendLog( State8080.pc.toString(16) + " | " + "POP B");
                break;
            case 0xc2:
                appendLog( State8080.pc.toString(16) + " | " + "JNZ " + toHexa(State8080.memory[State8080.pc+2]) + toHexa(State8080.memory[State8080.pc+1]));
                if (State8080.cc.Z == 0){
                    State8080.pc = State8080.memory[State8080.pc+2] << 8| State8080.memory[State8080.pc+1];
                }else{
                    State8080.pc+= 2;
                }
                break;
            case 0xc3:
                appendLog( State8080.pc.toString(16) + " | " + "JMP " + toHexa(State8080.memory[State8080.pc+2]) + toHexa(State8080.memory[State8080.pc+1]));
                State8080.pc = State8080.memory[State8080.pc+2] << 8| State8080.memory[State8080.pc+1];
                break;
            case 0xc4:
                appendLog( State8080.pc.toString(16) + " | " + "CNZ " + toHexa(State8080.memory[State8080.pc+2]) + toHexa(State8080.memory[State8080.pc+1]));
                if (State8080.cc.Z == 0){
                    push(State8080.pc + 2);
                    State8080.pc = State8080.memory[State8080.pc+2] << 8 | State8080.memory[State8080.pc+1];
                }else{
                State8080.pc+= 2;
                }
                break;
            case 0xc5:
                appendLog( State8080.pc.toString(16) + " | " + "PUSH B");
                break;
            case 0xc6:
                appendLog( State8080.pc.toString(16) + " | " + "ADI D8");
                State8080.pc++;
                break;
            case 0xc7:
                appendLog( State8080.pc.toString(16) + " | " + "RST 0");
                break;
            case 0xc8:
                appendLog( State8080.pc.toString(16) + " | " + "RZ");
                if (State8080.cc.Z == 1){
                    State8080.pc = pop();
                }
                break;
            case 0xc9:
                appendLog( State8080.pc.toString(16) + " | " + "RET");
                State8080.pc = pop();
                break;
            case 0xca:
                appendLog( State8080.pc.toString(16) + " | " + "JZ " + toHexa(State8080.memory[State8080.pc+2]) + toHexa(State8080.memory[State8080.pc+1]));
                if (State8080.cc.Z == 1){
                    State8080.pc = State8080.memory[State8080.pc+2] << 8| State8080.memory[State8080.pc+1];
                }else{
                    State8080.pc+= 2;
                }
                break;
            case 0xcc:
                appendLog( State8080.pc.toString(16) + " | " + "CZ " + toHexa(State8080.memory[State8080.pc+2]) + toHexa(State8080.memory[State8080.pc+1]));
                if (State8080.cc.Z == 1){
                    push(State8080.pc + 2);
                    State8080.pc = State8080.memory[State8080.pc+2] << 8| State8080.memory[State8080.pc+1];
                }else{
                State8080.pc+= 2;
                }
                break;
            case 0xcd:
                appendLog( State8080.pc.toString(16) + " | " + "CALL " + toHexa(State8080.memory[State8080.pc+2]) + toHexa(State8080.memory[State8080.pc+1]));
                push(State8080.pc + 2);
                State8080.pc = State8080.memory[State8080.pc+2] << 8 | State8080.memory[State8080.pc+1];
                break;
            case 0xce:
                appendLog( State8080.pc.toString(16) + " | " + "ACI D8");
                State8080.pc++;
                break;
            case 0xcf:
                appendLog( State8080.pc.toString(16) + " | " + "RST 1");
                break;
            case 0xd0:
                appendLog( State8080.pc.toString(16) + " | " + "RNC");
                if (State8080.cc.CY == 0){
                    State8080.pc = pop();
                }
                break;
            case 0xd1:
                appendLog( State8080.pc.toString(16) + " | " + "POP D");
                break;
            case 0xd2:
                appendLog( State8080.pc.toString(16) + " | " + "JNC " + toHexa(State8080.memory[State8080.pc+2]) + toHexa(State8080.memory[State8080.pc+1]));
                if (State8080.cc.CY == 0){
                    State8080.pc = State8080.memory[State8080.pc+2] << 8| State8080.memory[State8080.pc+1];
                }
                else{
                    State8080.pc+= 2;
                }
                break;
            case 0xd3:
                appendLog( State8080.pc.toString(16) + " | " + "OUT D8");
                State8080.pc++;
                break;
            case 0xd4:
                appendLog( State8080.pc.toString(16) + " | " + "CNC " + toHexa(State8080.memory[State8080.pc+2]) + toHexa(State8080.memory[State8080.pc+1]));
                if (State8080.cc.CY == 0){
                    push(State8080.pc + 2);
                    State8080.pc = State8080.memory[State8080.pc+2] << 8| State8080.memory[State8080.pc+1];
                }else{
                State8080.pc+= 2;
                }
                break;
            case 0xd5:
                appendLog( State8080.pc.toString(16) + " | " + "PUSH D");
                break;
            case 0xd6:
                appendLog( State8080.pc.toString(16) + " | " + "SUI D8");
                State8080.pc++;
                break;
            case 0xd7:
                appendLog( State8080.pc.toString(16) + " | " + "RST 2");
                break;
            case 0xd8:
                appendLog( State8080.pc.toString(16) + " | " + "RC");
                if (State8080.cc.CY == 1){
                    State8080.pc = pop();
                } 
                break;
            case 0xda:
                appendLog( State8080.pc.toString(16) + " | " + "JC " + toHexa(State8080.memory[State8080.pc+2]) + toHexa(State8080.memory[State8080.pc+1]));
                if (State8080.cc.CY == 1){
                    State8080.pc = State8080.memory[State8080.pc+2] << 8| State8080.memory[State8080.pc+1];
                }
                else {
                    State8080.pc+= 2;
                }
                break;
            case 0xdb:
                appendLog( State8080.pc.toString(16) + " | " + "IN D8");
                State8080.pc++;
                break;
            case 0xdc:
                appendLog( State8080.pc.toString(16) + " | " + "CC " + toHexa(State8080.memory[State8080.pc+2]) + toHexa(State8080.memory[State8080.pc+1] ));
                if (State8080.cc.CY == 1){
                    push(State8080.pc + 2);
                    State8080.pc = State8080.memory[State8080.pc+2] << 8 | State8080.memory[State8080.pc+1];
                }else{
                    State8080.pc+= 2;
                }
                break;
            case 0xde:
                appendLog( State8080.pc.toString(16) + " | " + "SBI D8");
                State8080.pc++;
                break;
            case 0xdf:
                appendLog( State8080.pc.toString(16) + " | " + "RST 3");
                break;
            case 0xe0:
                appendLog( State8080.pc.toString(16) + " | " + "RPO");
                if (State8080.cc.P == 0){
                    State8080.pc = pop();
                }
                break;
            case 0xe1:
                appendLog( State8080.pc.toString(16) + " | " + "POP H");
                break;
            case 0xe2:
                appendLog( State8080.pc.toString(16) + " | " + "JPO " + toHexa(State8080.memory[State8080.pc+2]) + toHexa(State8080.memory[State8080.pc+1] ));
                if (State8080.cc.P == 0){
                    State8080.pc = State8080.memory[State8080.pc+2] << 8| State8080.memory[State8080.pc+1];
                }else{
                    State8080.pc+= 2;
                }
                break;
            case 0xe3:
                appendLog( State8080.pc.toString(16) + " | " + "XTHL");
                break;
            case 0xe4:
                appendLog( State8080.pc.toString(16) + " | " + "CPO " + toHexa(State8080.memory[State8080.pc+2]) + toHexa(State8080.memory[State8080.pc+1] ));
                if (State8080.cc.P == 0){
                    push(State8080.pc + 2);
                    State8080.pc = State8080.memory[State8080.pc+2] << 8| State8080.memory[State8080.pc+1];
                }else{
                    State8080.pc+= 2;
                }
                break;
            case 0xe5:
                appendLog( State8080.pc.toString(16) + " | " + "PUSH H");
                break;
            case 0xe6:
                appendLog( State8080.pc.toString(16) + " | " + "ANI D8");
                State8080.pc++;
                break;
            case 0xe7:
                appendLog( State8080.pc.toString(16) + " | " + "RST 4");
                break;
            case 0xe8:
                appendLog( State8080.pc.toString(16) + " | " + "RPE");
                if (State8080.cc.P == 1){
                    State8080.pc = pop();
                }
                break;
            case 0xe9:
                appendLog( State8080.pc.toString(16) + " | " + "PCHL");
                break;
            case 0xea:
                appendLog( State8080.pc.toString(16) + " | " + "JPE " + toHexa(State8080.memory[State8080.pc+2]) + toHexa(State8080.memory[State8080.pc+1] ));
                if (State8080.cc.P == 1){
                    State8080.pc = State8080.memory[State8080.pc+2] << 8| State8080.memory[State8080.pc+1];
                }else{
                    State8080.pc+= 2;
                }
                break;
            case 0xeb:
                appendLog( State8080.pc.toString(16) + " | " + "XCHG");
                break;
            case 0xec:
                appendLog( State8080.pc.toString(16) + " | " + "CPE " + toHexa(State8080.memory[State8080.pc+2]) + toHexa(State8080.memory[State8080.pc+1] ));
                if (State8080.cc.P == 1){
                    push(State8080.pc + 2);
                    State8080.pc = State8080.memory[State8080.pc+2] << 8| State8080.memory[State8080.pc+1];
                }else{
                    State8080.pc+= 2;
                }
                break;
            case 0xee:
                appendLog( State8080.pc.toString(16) + " | " + "XRI D8");
                State8080.pc++;
                break;
            case 0xef:
                appendLog( State8080.pc.toString(16) + " | " + "RST 5");
                break;
            case 0xf0:
                appendLog( State8080.pc.toString(16) + " | " + "RP");
                if (State8080.cc.S == 0){
                    State8080.pc = pop();
                }
                break;
            case 0xf1:
                appendLog( State8080.pc.toString(16) + " | " + "POP PSW");
                break;
            case 0xf2:
                appendLog( State8080.pc.toString(16) + " | " + "JP " + toHexa(State8080.memory[State8080.pc+2]) + toHexa(State8080.memory[State8080.pc+1] ));
                if (State8080.cc.P == 0){
                    State8080.pc = State8080.memory[State8080.pc+2] << 8| State8080.memory[State8080.pc+1];
                }else{
                    State8080.pc+= 2;
                }
                break;
            case 0xf3:
                appendLog( State8080.pc.toString(16) + " | " + "DI");
                break;
            case 0xf4:
                appendLog( State8080.pc.toString(16) + " | " + "CP " + toHexa(State8080.memory[State8080.pc+2]) + toHexa(State8080.memory[State8080.pc+1]));
                if (State8080.cc.S == 0){
                    push(State8080.pc + 2);
                    State8080.pc = State8080.memory[State8080.pc+2] << 8 | State8080.memory[State8080.pc+1];
                }else{
                    State8080.pc+= 2;
                }
                break;
            case 0xf5:
                appendLog( State8080.pc.toString(16) + " | " + "PUSH PSW");
                break;
            case 0xf6:
                appendLog( State8080.pc.toString(16) + " | " + "ORI D8");
                State8080.pc++;
                break;
            case 0xf7:
                appendLog( State8080.pc.toString(16) + " | " + "RST 6");
                break;
            case 0xf8:
                appendLog( State8080.pc.toString(16) + " | " + "RM");
                if (State8080.cc.S == 1){
                    State8080.pc = pop();
                }
                break;
            case 0xf9:
                appendLog( State8080.pc.toString(16) + " | " + "SPHL");
                break;
            case 0xfa:
                appendLog( State8080.pc.toString(16) + " | " + "JM " + toHexa(State8080.memory[State8080.pc+2]) + toHexa(State8080.memory[State8080.pc+1] ));
                if (State8080.cc.S == 1){
                    State8080.pc = State8080.memory[State8080.pc+2] << 8| State8080.memory[State8080.pc+1];
                }else{
                State8080.pc+= 2;
                }
                break;
            case 0xfb:
                appendLog( State8080.pc.toString(16) + " | " + "EI");
                break;
            case 0xfc:
                appendLog( State8080.pc.toString(16) + " | " + "CM " + toHexa(State8080.memory[State8080.pc+2]) + toHexa(State8080.memory[State8080.pc+1] ));
                if (State8080.cc.S == 1){
                    push(State8080.pc + 2);
                    State8080.pc = State8080.memory[State8080.pc+2] << 8 | State8080.memory[State8080.pc+1];
                }else{
                    State8080.pc+= 2;
                }
                break;
            case 0xfe:
                appendLog( State8080.pc.toString(16) + " | " + "CPI D8");
                State8080.pc++;
                break;
            case 0xff:
                appendLog( State8080.pc.toString(16) + " | " + "RST 7");
                break;
            default:
                appendLog( State8080.pc.toString(16) + " | " + "UNDEFINED");
                break;
        }
    }
}
