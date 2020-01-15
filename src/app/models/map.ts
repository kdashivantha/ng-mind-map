import { Connection } from './connection';
import { MapNode } from './mapnode';
import * as _ from 'lodash';

export interface IMap extends IFirestoreDoc{
    text: string;
}
export class Map implements IMap{
    id: string;
    text: string = "new mind map";
    nodes: Array<MapNode> = [];

    constructor(args = {}) {
        Object.assign(this,args);
        this.nodes = (this.nodes || [] ).map(n => new MapNode(n));
    }

    public get dto() {
        return {
            "text" : this.text
        };
    }

    public getNodes():Array<MapNode> {
        return this.nodes;
    }
    public getConnections():Array<Connection> {
        const getSum = (total:Array<any>, node:MapNode) => {
            return total.concat(node.connections.map(c => <Connection>{
                "source": node.id,
                "target": c
            }));
        }
        return this.nodes.reduce(getSum,[]);
    }
}
