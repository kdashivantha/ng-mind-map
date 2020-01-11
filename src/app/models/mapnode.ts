export class MapNode implements IFirestoreDoc{
    id: string;
    text: string = "untitled";
    
    fx: number = 0;
    fy: number = 0;

    markdown: string = `## Edit Here..`;
    mapReferenceId:string = "";
    connections: Array<any> = []

    constructor(args = {}) {
        Object.assign(this,args);
    }

    public get dto(){
        return {
            "text" : this.text,
            "fx": this.fx,
            "fy": this.fy,
            "markdown": this.markdown,
            "mapReferenceId": this.mapReferenceId,
            "connections": this.connections        
        };
    }
}
