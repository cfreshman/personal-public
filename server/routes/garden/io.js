import * as M from './model';
import { J, U } from '../../util';
import { roomed } from '../../io';

export default (io, socket, info) => {
  roomed(io, socket, info, M.name)
};