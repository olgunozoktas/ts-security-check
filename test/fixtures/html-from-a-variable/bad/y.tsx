declare const html: string; declare const data: object; declare const DOMPurify: any;
export const A = () => <div dangerouslySetInnerHTML={{ __html: html }} />;
export const B = () => <script dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
