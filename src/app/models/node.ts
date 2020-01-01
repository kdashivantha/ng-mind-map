export class Node implements IFirestoreDoc{
    id: string;
    type: string = 'node';
    text: string;
    
    fx: number;
    fy: number;

    markdownid: string;
}
