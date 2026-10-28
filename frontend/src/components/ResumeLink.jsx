// Shows a resume URL as a clickable link, cut to the first 15 characters
// followed by "...". Hovering shows the full URL. The link is only rendered
// when it starts with http:// or https://, as a second safety check on top of
// the server-side validation.
const shortUrl = (url) => (url.length > 15 ? `${url.slice(0, 15)}...` : url);

export default function ResumeLink({ url }) {
  if (!url || !/^https?:\/\//i.test(url)) return <span>-</span>;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      className="text-brand-600 hover:underline whitespace-nowrap"
    >
      {shortUrl(url)}
    </a>
  );
}