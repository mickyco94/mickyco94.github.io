import * as disk from './disk.js';
import { string_to_ascii } from './ascii.js';

const EXPLAINER = `This is an implementation of a very basic file system in Javascript, entirely in the browser.
This is mostly a learning exercise for me but feel free to play around with it. 

Read about how it works by browsing the /docs.

You can: 
  Create a file using: touch [path] [contents]
  Make a directory using: mkdir [path]
  View the inode metadata using: stat [path]

Use help to see what other commands are available.
  `;

export function init() {
  const file_from_str = (path, content) =>
    disk.fappend(disk.create(path), string_to_ascii(content))

  disk.mkdir("docs");
  disk.mkdir("home");
  disk.mkdir("home/micky");
  disk.mkdir("tmp");
  ["home", "micky", "what", "is", "going", "on", "here", "this", "is", "really", "deeply", "nested"].reduce((acc, path) => {
    const ppath = acc + "/" + path;
    disk.mkdir(ppath);
    return ppath;
  }, "");
  file_from_str("/home/micky/what/is/going/on/here/this/is/really/deeply/nested/FINALLY", "bruh");
  file_from_str("README", EXPLAINER);
  //file_from_str("tmp/fsociety00.dat", "192.168.1.165");
}
