export class Connection implements IFirestoreDoc {
    id: string;
    type: string = 'conn';
    source: string;
    target: string;
}
