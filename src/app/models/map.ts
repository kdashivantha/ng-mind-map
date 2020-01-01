import { Connection } from './connection';

export class Map implements IFirestoreDoc{
    id: string;
    text: string;
    items: Array<Node | Connection>;
    /**
     *
     */
    constructor(args = {}) {
        
    }
}
