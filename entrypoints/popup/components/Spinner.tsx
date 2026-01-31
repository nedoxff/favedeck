// unfortunately the React import in common/Spinner.tsx is hijacked so that it could be used
// in the twitter website itself so some code will have to be duplicated
export default function Spinner() {
	return (
		<span className="border-fd-primary/25 border-b-fd-primary box-border inline-block rounded-full animate-spin border-4 w-8 h-8 aspect-square" />
	);
}
