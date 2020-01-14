import { Connection } from './connection';
import { MapNode } from './mapnode';
import * as _ from 'lodash';

export interface IMap extends IFirestoreDoc{
    text: string;
}
export class Map implements IMap{
    id: string;
    text: string = "new mind map";
    nodes: Array<MapNode>;

    private nodeType = 'node';
    private connType = 'conn';

    constructor(args = {}) {
        Object.assign(this,args);
        this.nodes = (this.nodes || [] ).map(n => new MapNode(n));
    }

    public get dto() {
        return {
            "text" : this.text
        };
    }

    public getDeepCloneMap(root: MapNode): Map {
        let tempMap = new Map();
        tempMap.text = root.text;
        tempMap.nodes = [];

        const node = _.find(this.nodes,{'id':root.id});
        if(node) {
            tempMap.nodes = tempMap.nodes.concat(this.cloneNode(node));
        }
        return tempMap;
    }

    public getNodes():Array<MapNode> {
        return this.nodes;
    }
    public getConnections():Array<Connection> {
        function getSum(total:Array<any>, node:MapNode) {
            return total.concat(node.connections.map(c => <Connection>{
                "source": node.id,
                "target": c
            }));
        }

        return this.nodes.reduce(getSum,[]);
    }

    private cloneNode(cloneNode:MapNode):Array<any>{
        let results = [cloneNode];

        const thisNodeConnections =  _.filter(this.nodes, item => { 
            return item.type==this.connType && item.source.id==cloneNode.id; 
        });

        if(thisNodeConnections.length == 0)
            return results;

        results = results.concat(thisNodeConnections);

        const connectedNodesIds = thisNodeConnections.map(c => c.target.id);
        const connectedNodes = _.filter(this.nodes, function(item) {
            return _.indexOf(connectedNodesIds, item.id) >= 0;
        });

        _.forEach(connectedNodes, (node:MapNode) => {
            results = results.concat(this.cloneNode(node));
        });

        return results;
    }
}
