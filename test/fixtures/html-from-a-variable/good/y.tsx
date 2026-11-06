declare const html: string; declare const DOMPurify: any;
export const A = () => <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
export const B = () => <div dangerouslySetInnerHTML={{ __html: "<br>" }} />;
