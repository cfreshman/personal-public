import express from 'express';
import { J, P } from '../../util';
import * as M from './model';

export default {
    model: M, ...M,
}
