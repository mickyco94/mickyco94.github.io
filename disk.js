const BYTES = 16 * 1024 * 1024; // 16mb
const DISK = new Uint8Array(BYTES);

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
  blocks: 2 << 7,
  inodes: 256,
  block_size: 2 << 15,
  root_inode: 0,
  current_inode: 0,
  current_block: 0,
  inode_table_size: 256 * 12,
};

// inode structure:
// [t][s][[b][of]][b][of][b][of]]
// - type (1 byte)
// - size (2 bytes) 
// - blocks (9 bytes)
//   - block (1 byte)
//   - offset (2 bytes)
// Total size: 1+2+9 = 12. We can add more for created_at etc.
const INODE_SIZE = 12;
const FILE = 0;
const DIR = 1;

function write_inode({ id, type, size, blocks }) {
  const [size_b1, size_b2] = uint16_little_endian(size);
  const start = id * INODE_SIZE;
  DISK[start] = type;
  DISK[start + 1] = size_b1;
  DISK[start + 2] = size_b2;
  for (let i = 0; i < blocks.length; i++) {
    const { block, offset } = blocks[i];
    const [offset_b1, offset_b2] = uint16_little_endian(offset);
    DISK[start + 3 + (i * 3)] = block;
    DISK[start + 3 + (i * 3) + 1] = offset_b1;
    DISK[start + 3 + (i * 3) + 2] = offset_b2;
  }
}

function next_block() {
  return ++SUPERBLOCK.current_block;
}

function next_inode() {
  return ++SUPERBLOCK.current_inode
}

function get_inode(id) {
  const start = id * INODE_SIZE;
  const type = DISK[start];
  const size = little_endian_uint16([DISK[start + 1], DISK[start + 2]]);
  const blocks = [];
  for (let i = 0; i < 3; i++) {
    const block = DISK[start + 3 + (i * 3)];
    const offset_b1 = DISK[start + 3 + (i * 3) + 1];
    const offset_b2 = DISK[start + 3 + (i * 3) + 2];
    const offset = little_endian_uint16([offset_b1, offset_b2]);
    blocks.push({ block: block, offset: offset });
  }
  return {
    id: id,
    type: type,
    size: size,
    blocks: blocks,
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
    id: 0,
    type: DIR,
    size: 2 * ENTRY_SIZE,
    blocks: [{ block: 0, offset: 0 }],
  }
  write_inode(root_inode);
  const dot = _create_dir_entry({ name: ".", inode_id: root_inode.id })
  const dotdot = _create_dir_entry({ name: "..", inode_id: root_inode.id })
  const buffer = [...dot, ...dotdot];
  write(root_inode, new Uint8Array(buffer));
}

function read_dir_file(buffer) {
  console.log(buffer);
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
  return files;
}

function find_inode(paths) {
  let current_inode = SUPERBLOCK.root_inode;
  for (const path of paths) {
    const inode = get_inode(current_inode);
    if (inode === -1) {
      console.error("Couldn't find inode");
      return -1;
    }
    const { size } = inode;
    const buffer = new Uint8Array(size);
    read(inode, buffer, size);
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

export function read_dir(path) {
  const inode_id = find_inode(path.split("/"));
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
  const files = read_dir_file(buffer);
  console.log(files);
  return files;
}

export function mkdir(path) {
  const parts = path.split("/");
  const name = parts.at(-1);
  const parent_id = find_inode(parts.slice(0, -1));
  const parent_inode = get_inode(parent_id);
  if (parent_inode.type !== DIR) {
    return -1;
  }
  const inode_id = next_inode();
  const block = next_block();
  const inode = { id: inode_id, type: DIR, size: 2 * ENTRY_SIZE, blocks: [{ block: block, offset: 0 }] };
  write_inode(inode);
  const buffer = [
    ..._create_dir_entry({ name: ".", inode_id: inode_id }),
    ..._create_dir_entry({ name: "..", inode_id: inode_id }),
  ]
  write(inode, buffer);
  const parent_buffer = _create_dir_entry({ name: name, inode_id: inode_id });
  append(parent_inode, parent_buffer);
}

export function create(path) {
  const parts = path.split("/");
  const name = parts.at(-1);
  const parent_id = find_inode(parts.slice(0, -1));
  const parent_inode = get_inode(parent_id);
  if (parent_inode.type !== DIR) {
    return -1;
  }
  const block = next_block();
  const inode = { id: next_inode(), type: FILE, size: 0, blocks: [{ block: block, offset: 0 }] };
  console.log("Creating inode:", inode, "for file", path);
  write_inode(inode);
  const buffer = _create_dir_entry({ name: name, inode_id: inode.id });
  append(parent_inode, buffer);
  return inode;
}

export function read({ blocks }, buffer, size) {
  const n = buffer.length;
  if (n > size) {
    return -1;
  }
  for (let i = 0; i < n; i++) {
    const block_idx = Math.floor(i / SUPERBLOCK.block_size);
    const { block, offset } = blocks[block_idx];
    buffer[i] = DISK[SUPERBLOCK.inode_table_size + (block * SUPERBLOCK.block_size) + offset + i];
  }

  return size;
}

export function write({ size, blocks }, buffer) {
  const n = buffer.length;
  if (n > size) {
    return -1;
  }
  for (let i = 0; i < n; i++) {
    const block_idx = Math.floor(i / SUPERBLOCK.block_size);
    if (block_idx > blocks.length - 1) {
      console.error("not enough blocks", n, blocks, block_idx);
      return -1;
    }
    const { block, offset } = blocks[block_idx];
    const disk_index = SUPERBLOCK.inode_table_size + (block * SUPERBLOCK.block_size) + offset + i;
    DISK[disk_index] = buffer[i];
  }
  return n;
}

export function append(inode, buffer) {
  console.log(inode, buffer);
  const { blocks, size } = inode;
  const { offset } = blocks.at(0);
  const n = buffer.length;
  if (offset + n >= SUPERBLOCK.block_size) {
    console.error("block full");
    return -1;
  }
  for (let i = 0; i < n; i++) {
    const block_idx = Math.floor(i / SUPERBLOCK.block_size);
    if (block_idx > blocks.length - 1) {
      console.error("not enough blocks", n, blocks, block_idx);
      return -1;
    }
    const { block, offset } = blocks[block_idx];

    const disk_index = SUPERBLOCK.inode_table_size + size + (block * SUPERBLOCK.block_size) + offset + i;
    DISK[disk_index] = buffer[i];
  }
  const updated_inode = {
    ...inode,
    size: size + n,
  }
  console.log("Updating inode", updated_inode);
  write_inode(updated_inode);
  return n;
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
