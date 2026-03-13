export const BYTES = 16 * 1024 * 1024; // 16mb
export const DISK = new Uint8Array(BYTES);

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

const SUPERBLOCK = {
  fs: "toy",
  blocks: 2 << 15,
  inodes: 256, // This spacing is odd
  block_size: 256,
  root_inode: 1,
  inode_table_size: 256 * 16,
  free_blocks: Array.from({ length: 256 }).map((_, i) => i + 1).reverse(),
  free_inodes: Array.from({ length: 256 }).map((_, i) => i + 1).reverse(),
};

function next_block() {
  if (SUPERBLOCK.free_blocks.length === 0)
    return -1;
  return SUPERBLOCK.free_blocks.pop();
}

function free_block(id) {
  SUPERBLOCK.free_blocks.push(id);
}

function next_inode() {
  if (SUPERBLOCK.free_inodes.length === 0)
    return -1;
  return SUPERBLOCK.free_inodes.pop();
}

function free_inode(id) {
  SUPERBLOCK.free_inodes.push(id);
  // Do I need to zero out the INODE table?
}

export function inode_count() {
  return 256 - SUPERBLOCK.free_inodes.length;
}

export const EPOCH = 786672000;
let NOW = EPOCH;
function timer() {
  NOW += 1
  setTimeout(timer, 1000);
}
timer()

export function now() {
  return NOW - EPOCH;
}

// inode structure:
// [uid][t][l][s][[b][b][b][ctime][atime][mtime][other]
// - id (1 byte)
// - type (1 byte)
// - link count (1 byte)
// - size (2 bytes) 
// - block (1 byte)
// - block (1 byte)
// - block (1 byte)
// - created_time(2 bytes)
// - access_time (2 bytes)
// - modified time (2 bytes)
// - reserved (2 bytes)
// Total size: 1+2+3+2+2 = 10. We can add more for created_at etc.
const INODE_SIZE = 16;
const FILE = 0;
const DIR = 1;

function write_inode({ id, type, link, size, b1, b2, b3, ctime, atime, mtime }) {
  const [size_b1, size_b2] = uint16_little_endian(size);
  const [ctime_b1, ctime_b2] = uint16_little_endian(ctime);
  const [atime_b1, atime_b2] = uint16_little_endian(atime);
  const [mtime_b1, mtime_b2] = uint16_little_endian(mtime);
  const start = id * INODE_SIZE;
  DISK[start] = id;
  DISK[start + 1] = type;
  DISK[start + 2] = link;
  DISK[start + 3] = size_b1;
  DISK[start + 4] = size_b2;
  DISK[start + 5] = b1;
  DISK[start + 6] = b2;
  DISK[start + 7] = b3;
  DISK[start + 8] = ctime_b1;
  DISK[start + 9] = ctime_b2;
  DISK[start + 10] = atime_b1;
  DISK[start + 11] = atime_b2;
  DISK[start + 12] = mtime_b1;
  DISK[start + 13] = mtime_b2;
  DISK[start + 14] = 0;
  DISK[start + 15] = 0;
}

function get_inode(id) {
  const start = id * INODE_SIZE;
  const uid = DISK[start];
  const type = DISK[start + 1];
  const link = DISK[start + 2]
  const size_b1 = DISK[start + 3]
  const size_b2 = DISK[start + 4]
  const b1 = DISK[start + 5];
  const b2 = DISK[start + 6];
  const b3 = DISK[start + 7];
  const ctime_b1 = DISK[start + 8];
  const ctime_b2 = DISK[start + 9];
  const atime_b1 = DISK[start + 10];
  const atime_b2 = DISK[start + 11];
  const mtime_b1 = DISK[start + 12];
  const mtime_b2 = DISK[start + 13];
  const size = little_endian_uint16([size_b1, size_b2]);
  const ctime = little_endian_uint16([ctime_b1, ctime_b2]);
  const atime = little_endian_uint16([atime_b1, atime_b2]);
  const mtime = little_endian_uint16([mtime_b1, mtime_b2]);

  const new_atime = now();
  const [new_atime_b1, new_atime_b2] = uint16_little_endian(new_atime);
  DISK[start + 10] = new_atime_b1;
  DISK[start + 11] = new_atime_b2;


  return {
    id: uid, type, link, size, b1, b2, b3, ctime, atime, mtime,
  }
}

const ENTRY_SIZE = 16;
const MAX_ENTRY_NAME_SIZE = 14;

// Each entry consists of:
// [-- name 14 bytes --][--occupied--][--inode--]
// I can remove occupied if I have an unbounded file size.

function _create_dir_entry({ name, inode_id }) {
  const buffer = new Uint8Array(ENTRY_SIZE);
  for (let i = 0; i < MAX_ENTRY_NAME_SIZE; i++) {
    buffer[i] = name.charCodeAt(i) ?? 0;
  }
  buffer[MAX_ENTRY_NAME_SIZE] = 1;
  buffer[MAX_ENTRY_NAME_SIZE + 1] = inode_id;
  return buffer;
}

function create_root_dir() {
  const root_inode = {
    id: 1,
    type: DIR,
    size: 2 * ENTRY_SIZE,
    b1: 1,
    ctime: now(),
    atime: now(),
    mtime: now(),
  }
  write_inode(root_inode);
  const dot = _create_dir_entry({ name: ".", inode_id: root_inode.id })
  const dotdot = _create_dir_entry({ name: "..", inode_id: root_inode.id })
  const buffer = [...dot, ...dotdot];
  write(root_inode, new Uint8Array(buffer));
}

function parse_dir_file(buffer) {
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
    files.push({ name, inode_id, occupied, inode: get_inode(inode_id), });
  }
  return files
}

function find_inode(path) {
  path = path.startsWith("/") ? path.slice(1) : path;
  path = path.endsWith("/") ? path.slice(0, -1) : path;
  let current_inode = SUPERBLOCK.root_inode;
  if (!path)
    return current_inode;
  for (const part of path.split("/")) {
    const inode = get_inode(current_inode);
    if (inode === -1) {
      console.error("couldn't find inode");
      return -1;
    }
    const { size } = inode;
    const buffer = new Uint8Array(size);
    read(inode, buffer, size);
    const files = parse_dir_file(buffer);

    let found = false;
    for (const { name, inode_id } of files) {
      if (name === part) {
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

export function read_dir(path) {
  const inode_id = find_inode(path);
  if (inode_id === -1) {
    console.error("Could not find inode for ", path);
    return -1;
  }
  const inode = get_inode(inode_id);
  const { size } = inode;
  const buffer = new Uint8Array(size);
  const read_bytes = read(inode, buffer, size);
  if (read_bytes == -1) {
    console.error("Failed to read dir");
    return -1;
  }
  const files = parse_dir_file(buffer);
  return files.toSorted((a, b) => b.inode.type - a.inode.type || a.name.localeCompare(b.name));
}

// Must be an absolute path
export function mkdir(path) {
  path = path.endsWith("/") ? path.slice(0, -1) : path;

  const existing = find_inode(path);
  if (existing !== -1) {
    console.log("file exists");
    return -1;
  }
  const name = path.split("/").at(-1);
  if (!name) {
    console.error("no name");
    return -1
  }
  const parent = path.slice(0, -name.length);
  const parent_id = find_inode(parent);
  const parent_inode = get_inode(parent_id);
  if (parent_inode.type !== DIR) {
    return -1;
  }
  const inode_id = next_inode();
  const block = next_block();
  const inode = { id: inode_id, type: DIR, size: 2 * ENTRY_SIZE, b1: block, ctime: now(), atime: now(), mtime: now() };

  // Update parent reference
  const parent_buffer = _create_dir_entry({ name: name, inode_id: inode_id });
  if (append(parent_inode, parent_buffer) === -1) {
    return -1;
  };
  write_inode(inode);
  const buffer = [
    ..._create_dir_entry({ name: ".", inode_id: inode_id }),
    ..._create_dir_entry({ name: "..", inode_id: parent_id }),
  ]
  write(inode, buffer);

}

export function create(path) {
  const existing = find_inode(path);
  if (existing !== -1) {
    console.error("already exists");
    return -1;
  }
  const name = path.split("/").at(-1);
  if (!name) {
    console.error("no name");
    return -1;
  }
  const parent_id = find_inode(path.slice(0, -name.length));
  const parent_inode = get_inode(parent_id);
  if (parent_inode.type !== DIR) {
    return -1;
  }
  const block = next_block();
  const inode = {
    id: next_inode(),
    type: FILE,
    link: 0,
    size: 0,
    b1: block,
    b2: 0,
    b3: 0,
    ctime: now(),
    atime: now(),
    mtime: now(),
  };
  write_inode(inode);
  const buffer = _create_dir_entry({ name: name, inode_id: inode.id });
  if (append(parent_inode, buffer) === -1) {
    console.error("failed to write to parent on creation");
    return -1;
  }
  return inode;
}

export function read({ b1, b2, b3 }, buffer, size) {
  const n = buffer.length;
  if (n > size) {
    return -1;
  }
  const blocks = [b1, b2, b3];
  for (let i = 0; i < n; i++) {
    const block_idx = Math.floor(i / SUPERBLOCK.block_size);
    const block = blocks[block_idx];
    buffer[i] = DISK[SUPERBLOCK.inode_table_size + (block * SUPERBLOCK.block_size) + i];
  }

  return size;
}

export function write(inode, buffer) {
  const { b1, b2, b3 } = inode
  const n = buffer.length;
  const blocks = [b1, b2, b3];
  for (let i = 0; i < n; i++) {
    const block_idx = Math.floor(i / SUPERBLOCK.block_size);
    const block = blocks[block_idx];
    const disk_index = SUPERBLOCK.inode_table_size + (block * SUPERBLOCK.block_size) + i;
    DISK[disk_index] = buffer[i];
  }
  const updated = {
    ...inode,
    mtime: now(),
  }
  write_inode(updated);
  return n;
}

export function append(inode, buffer) {
  const { b1, b2, b3, size } = inode;
  const blocks = [b1, b2, b3];
  const n = buffer.length;
  if (n >= SUPERBLOCK.block_size * 3) {
    console.error("blocks full");
    return -1;
  }
  for (let i = 0; i < n; i++) {
    const block_idx = Math.floor((size + i) / SUPERBLOCK.block_size);
    if (block_idx >= blocks.length) {
      console.error("not enough blocks", n, blocks, block_idx);
      return -1;
    }
    let block = blocks[block_idx];
    // todo: move this out of the loop.
    if (block === 0) {
      console.log("allocating block!");
      block = next_block();
      blocks[block_idx] = block;
    }

    const disk_index = SUPERBLOCK.inode_table_size + size + (block * SUPERBLOCK.block_size) + i;
    DISK[disk_index] = buffer[i];
  }
  const updated_inode = {
    ...inode,
    b1: blocks[0],
    b2: blocks[1],
    b3: blocks[2],
    size: size + n,
    mtime: now(),
  }
  write_inode(updated_inode);
  return n;
}

export function fstat(inode_id) {
  return get_inode(inode_id);
}

export function stat(path) {
  const fd = find_inode(path);
  return fd === -1 ? -1 : fstat(fd);
}

function _rm_dir_entry(dir_inode, name) {
  const { size } = dir_inode;
  const buffer = new Uint8Array(size);
  if (read(dir_inode, buffer, size) === -1) {
    console.log("failed to read buffer");
    return -1;
  }

  const files = parse_dir_file(buffer);
  const idx = files.findIndex(x => x.name === name);

  if (idx === -1) {
    console.error("Could not find file to remove from dir", name);
    return -1;
  }

  const updated_buffer = [
    ...buffer.slice(0, idx * ENTRY_SIZE), // up to the entry
    ...buffer.slice((idx + 1) * ENTRY_SIZE), // after the entry
  ]

  // I should use truncate too.
  if (write(dir_inode, updated_buffer) === -1) {
    console.error("failed to write to parent dir");
    return -1;
  }

  write_inode({
    ...dir_inode,
    size: size - ENTRY_SIZE,
    mtime: now(),
  });
}


export function rmdir(path) {
  const name = path.split("/").at(-1);
  if (!name) {
    console.error("couldn't get name");
    return -1;
  }

  const dir = path.slice(0, -name.length);
  if (!dir) {
    return -1;
  }

  const inode = stat(path);
  if (inode === -1) {
    return -1;
  }

  const dir_inode = stat(dir);
  if (dir_inode === -1) {
    return -1;
  }

  const { id, type, size, b1, b2, b3 } = inode;
  if (type !== DIR) {
    return -1;
  }

  if (size > ENTRY_SIZE * 2) {
    return -1;
  }

  if (_rm_dir_entry(dir_inode, name) == -1) {
    return -1;
  }

  [b1, b2, b3].map(b => b !== 0).map(b => free_block(b));
  free_inode(id);
}

export function rm(path) {
  const inode = stat(path);
  if (inode === -1)
    return -1;

  const { id, type, b1, b2, b3 } = inode;
  if (type === DIR) {
    return -1;
  }

  const name = path.split("/").at(-1);
  if (!name) {
    return -1;
  }

  const dir = path.slice(0, -name.length);

  const dir_inode = stat(dir);
  if (dir_inode === -1) {
    return -1;
  }

  if (_rm_dir_entry(dir_inode, name) === -1) {
    return -1;
  }

  [b1, b2, b3].filter(b => b !== 0).map(b => free_block(b));
  free_inode(id);
}

function init() {
  create_root_dir();
  for (const dir of ["/bin", "/root", "/home", "/home/micky", "/sys", "/var", "/tmp"]) {
    mkdir(dir);
  }
  // Placeholders for now
  for (const file of ["./README.md"]) {
    create(file);
  }
}

init();
