const BYTES = 64 * 1024;
const DISK = new Uint8Array(BYTES);

const SUPERBLOCK = {
  fs: "toy",
  //blocks: 16,
  inodes: 256,
  //block_size: BYTES / 16,
  root_inode: 0,
  current_inode: 0,
  current_end: 4 * 256, // Offset by the inode table
};

// Each inode is 4 bytes Maybe we also indicate a file type :panik:
// offset could be anywhere on disk so the range needs to support how big the disk is
// I guess this is why you have blocks!
// t = type
// s = size
// of = two bytes of offset in little endian
// [t][s][of]
const INODE_SIZE = 4;
const FILE = 0;
const DIR = 1;


function uint16_little_endian(n) {
  if (n > 65535 || n < 0) {
    console.error("not a uint16");
    return;
  }
  return [
    n & 0xFF,
    (n >> 8) & 0xFF,
  ]
}

function little_endian_uint16(bytes) {
  return bytes[0] | bytes[1] << 8;
}

function write_inode({ id, type, size, offset }) {
  const [offset_b1, offset_b2] = uint16_little_endian(offset);
  const start = id * INODE_SIZE;
  DISK[start] = type;
  DISK[start + 1] = size;
  DISK[start + 2] = offset_b1;
  DISK[start + 3] = offset_b2;
}

function next_inode() {
  return ++SUPERBLOCK.current_inode;
}

function get_inode(id) {
  const start = id * INODE_SIZE;
  const offset = little_endian_uint16([DISK[start + 2], DISK[start + 3]]);
  return {
    type: DISK[start],
    size: DISK[start + 1],
    offset: offset,
  }
}


const DIR_ENTRIES = 8;
const ENTRY_SIZE = 16;
const DIR_SIZE = DIR_ENTRIES * ENTRY_SIZE;
const MAX_ENTRY_NAME_SIZE = 14;

// Each entry consists of:
// [-- name 14 bytes --][--occupied--][--inode--]
// I can remove occupied if I have an unbounded file size.

function write_dir_entry({ name, inode_id, offset }) {
  for (let i = 0; i < MAX_ENTRY_NAME_SIZE; i++) {
    DISK[offset + i] = name.charCodeAt(i) ?? 0;
  }
  DISK[offset + MAX_ENTRY_NAME_SIZE] = 1
  DISK[offset + MAX_ENTRY_NAME_SIZE + 1] = inode_id
}

function create_root_dir() {
  const file_offset = SUPERBLOCK.current_end;
  const inode = 0;
  write_inode({ id: inode, type: DIR, size: DIR_SIZE, offset: SUPERBLOCK.current_end });
  write_dir_entry({ name: ".", inode_id: inode, offset: file_offset });
  write_dir_entry({ name: "..", inode_id: inode, offset: file_offset + ENTRY_SIZE });
  SUPERBLOCK.current_end += DIR_SIZE;
}

// Accepts a directory inode
function _find_dir_slot({ offset }) {
  for (let i = 0; i < DIR_ENTRIES; i++) {
    const occupied = DISK[offset + MAX_ENTRY_NAME_SIZE + (i * ENTRY_SIZE)]
    if (!occupied) {
      return i;
    }
  }
  return -1;
}

export function read_dir(path) {
  const parts = path.split("/");
  const inode_id = find_inode(parts);
  const { size, offset, type } = get_inode(inode_id);
  if (type === FILE)
    return -1
  const files = [];
  for (let i = 0; i < 7; i++) {

    const occupied = DISK[offset + (i * ENTRY_SIZE) + MAX_ENTRY_NAME_SIZE];
    if (occupied === 0) {
      continue;
    }
    let name = ""
    for (let j = 0; j < MAX_ENTRY_NAME_SIZE; j++) {
      const b = DISK[offset + (i * ENTRY_SIZE) + j]
      if (!b) {
        break;
      }
      name += String.fromCharCode(b);
    }
    const inode_id = DISK[offset + (i * ENTRY_SIZE) + MAX_ENTRY_NAME_SIZE + 1];
    const inode = get_inode(inode_id);
    files.push({ name, inode_id, inode });
  }
  return files;
}


function read_dir_file(buffer) {
  const files = [];
  for (let i = 0; i < buffer.length; i += ENTRY_SIZE) {
    let name = ""
    for (let j = 0; j < MAX_ENTRY_NAME_SIZE; j++) {
      const b = buffer[i + j]
      if (!b) {
        break;
      }
      name += String.fromCharCode(b);
    }
    const occupied = buffer[i + MAX_ENTRY_NAME_SIZE];
    const inode_id = buffer[i + MAX_ENTRY_NAME_SIZE + 1];
    files.push({ name, inode_id, occupied });
  }
  return files;
}

function find_inode(paths) {
  let current_inode = SUPERBLOCK.root_inode;
  for (const path of paths) {
    const { size, offset } = get_inode(current_inode);
    const buffer = new Uint8Array(size);
    read({ offset }, buffer, size);
    const files = read_dir_file(buffer);

    let found = false;
    for (const { name, inode_id } of files) {
      if (name === path) {
        current_inode = inode_id;
        found = true;
        break;
      }
    }
    if (!found) {
      return -1;
    }
  }
  return current_inode;
}

export function mkdir(path) {
  const parts = path.split("/");
  const folder = parts.at(-1);
  const parent_id = find_inode(parts.slice(0, -1));
  const parent_inode = get_inode(parent_id);
  if (parent_inode.type !== DIR) {
    return -1;
  }
  const slot = _find_dir_slot(parent_inode);
  if (slot === -1) {
    return -1;
  }
  const inode_id = next_inode();
  write_inode({ id: inode_id, type: DIR, size: DIR_SIZE, offset: SUPERBLOCK.current_end });
  write_dir_entry({ name: folder, inode_id: inode_id, offset: parent_inode.offset + (slot * ENTRY_SIZE) });
  write_dir_entry({ name: ".", inode_id: inode_id, offset: SUPERBLOCK.current_end });
  write_dir_entry({ name: "..", inode_id: inode_id, offset: SUPERBLOCK.current_end + ENTRY_SIZE });
  SUPERBLOCK.current_end += DIR_SIZE;
}

export function create(path, size) {
  const parts = path.split("/");
  const name = parts.at(-1);
  const parent_id = find_inode(parts.slice(0, -1));
  const parent_inode = get_inode(parent_id);
  if (parent_inode.type !== DIR) {
    return -1;
  }
  const free_slot = _find_dir_slot(parent_inode);
  if (free_slot === -1) {
    return -1;
  }
  const offset = SUPERBLOCK.current_end;
  const inode = { id: next_inode(), type: FILE, size: size, offset: offset };
  write_inode(inode);
  write_dir_entry({ name: name, inode_id: inode.id, offset: parent_inode.offset + (ENTRY_SIZE * free_slot) });
  SUPERBLOCK.current_end += size;
  return inode;
}

export function open(file_name) {
  if (file_name === "") {
    return -1;
  }
  let current_inode = SUPERBLOCK.root_inode;
  for (const { name, inode_id } of read_dir(current_inode)) {
    if (file_name === name) {
      console.log(file_name, name);
      return get_inode(inode_id);
    }
  }
  return -1;

}

export function read({ offset }, buffer, size) {
  for (let i = 0; i < size; i++) {
    buffer[i] = DISK[offset + i]
  }
  return size;
}


export function write({ offset, size }, buffer) {
  if (offset + size > BYTES) {
    console.error("DISK FULL");
    return -1;
  }
  for (let i = 0; i < size; i++) {
    DISK[offset + i] = buffer[i];
  }
  return size;
}

// Returns an inode
export function stat(path) {
  const parts = path.split("/");
  const inode_id = find_inode(parts);
  if (inode_id === -1) {
    return -1;
  }
  return get_inode(inode_id);
}

create_root_dir();
console.log(find_inode("."));
console.log(find_inode("folder"));
mkdir("./test");
