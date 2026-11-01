import objectsIllustration from './assets/objets.svg';

export type ServiceId = 'graphique' | 'impression' | 'textile' | 'objets' | 'toile';
export type Field = {
    name: string;
    label: string;
    options?: string[];
    required?: boolean;
    type?: string;
    placeholder?: string;
};
export const services: {
    id: ServiceId;
    title: string;
    short: string;
    description: string;
    image: string;
    fields: Field[];
}[] = [
    { id: 'graphique', title: 'Conception graphique', short: 'Une identité qui vous ressemble.', description: 'Logo, identité visuelle, affiches et supports numériques. Donnons une direction claire et cohérente à votre communication.', image: '/assets/cartes.webp', fields: [{ name: 'creation', label: 'Création souhaitée', required: true, options: ['Logo / identité visuelle', 'Affiche / flyer', 'Visuel pour réseaux sociaux', 'Carte de visite / papeterie', 'Autre création graphique'] }, { name: 'usage', label: 'Utilisation prévue', required: true, options: ['Numérique', 'Imprimée', 'Numérique et imprimée', 'À définir'] }, { name: 'format', label: 'Formats et nombre de déclinaisons', placeholder: 'Ex. : 1 affiche A3 + 2 formats pour réseaux sociaux' }, { name: 'existing', label: 'Éléments déjà disponibles', required: true, options: ['Tout est à créer', 'Logo disponible', 'Textes et images disponibles', 'Charte graphique disponible', 'À préciser ensemble'] }] },
    { id: 'impression', title: 'Impression publicitaire', short: 'Vos idées prennent place.', description: 'Cartes, flyers, bâches et signalétique. Nous préparons vos visuels et accompagnons la production auprès de partenaires imprimeurs.', image: '/assets/enseigne.webp', fields: [{ name: 'support', label: 'Support à imprimer', required: true, options: ['Bâche', 'Kakémono', 'Flyer', 'Carte de visite', 'Autocollant / étiquette', 'Autre support'] }, { name: 'quantity', label: 'Quantité', required: true, type: 'number' }, { name: 'format', label: 'Dimensions / format avec unité', required: true, placeholder: 'Ex. : A5 ou 100 × 200 cm' }, { name: 'existing', label: 'État du visuel', required: true, options: ['Visuel prêt à imprimer', 'Visuel à adapter', 'Visuel à créer', 'À définir'] }, { name: 'finish', label: 'Matière / finition souhaitée' }, { name: 'location', label: 'Ville / lieu de remise souhaité' }] },
    { id: 'textile', title: 'Personnalisation textile', short: 'Portez fièrement vos couleurs.', description: 'Des textiles pour votre équipe, votre événement ou votre marque. Le support et le visuel déterminent la technique de marquage.', image: '/assets/textile.webp', fields: [{ name: 'support', label: 'Type de textile', required: true, options: ['T-shirt', 'Polo', 'Autre textile', 'À définir'] }, { name: 'quantity', label: 'Nombre de pièces', required: true, type: 'number' }, { name: 'sizes', label: 'Tailles et couleurs', required: true, placeholder: 'Ex. : 5 S, 10 M, 5 L ; blanc et bleu marine' }, { name: 'placement', label: 'Emplacement du marquage', required: true, options: ['Devant', 'Dos', 'Devant et dos', 'Manche(s)', 'Plusieurs emplacements, à préciser', 'À définir'] }, { name: 'supply', label: 'Fourniture des textiles', required: true, options: ['Je fournis les textiles', 'Je souhaite être accompagné(e)', 'À définir'] }, { name: 'existing', label: 'État du visuel', required: true, options: ['Visuel disponible', 'Visuel à adapter', 'Visuel à créer', 'À définir'] }, { name: 'material', label: 'Matière et taille du marquage' }] },
    {
        id: 'objets', title: 'Personnalisation d’objets',
        short: 'Tasses et thermos à votre image.',
        description: 'Impression personnalisée sur tasses à café, mugs et thermos portables. Un logo, un prénom, un texte ou un visuel pour vos cadeaux, votre équipe ou votre marque. Le rendu et la faisabilité sont précisés selon l’objet choisi.',
        image: objectsIllustration,
        fields: [
            { name: 'support', label: 'Objet à personnaliser', required: true, options: ['Tasse à café / mug', 'Thermos portable', 'À définir ensemble'] },
            { name: 'quantity', label: 'Nombre de pièces', required: true, type: 'number' },
            { name: 'capacity', label: 'Contenance / modèle souhaité', placeholder: 'Ex. : tasse 330 ml ou thermos 500 ml, à confirmer' },
            { name: 'colors', label: 'Couleurs souhaitées', placeholder: 'Couleur de l’objet et du visuel' },
            { name: 'placement', label: 'Emplacement de la personnalisation', required: true, options: ['Une face', 'Deux faces', 'À définir ensemble'] },
            { name: 'personalization', label: 'Personnalisation souhaitée', options: ['Logo', 'Prénom / texte', 'Photo / illustration', 'Logo et texte', 'À définir ensemble'] },
            { name: 'existing', label: 'État du visuel', required: true, options: ['Visuel disponible', 'Visuel à adapter', 'Visuel à créer', 'À définir'] },
        ],
    },
    { id: 'toile', title: 'Créations sur toile', short: 'Un peu de vous, sur vos murs.', description: 'Une peinture ou un tableau personnalisé pour un lieu, une occasion, une personne. Nous définissons ensemble le format et l’ambiance.', image: '/assets/atelier.webp', fields: [{ name: 'creation', label: 'Type de création', required: true, options: ['Tableau personnalisé', 'Peinture sur toile', 'À définir ensemble'] }, { name: 'quantity', label: 'Nombre de pièces', required: true, type: 'number' }, { name: 'format', label: 'Dimensions souhaitées', required: true }, { name: 'ambience', label: 'Style / ambiance', required: true }, { name: 'occasion', label: 'Destination / occasion' }, { name: 'frame', label: 'Encadrement', options: ['Souhaité, à étudier', 'Sans encadrement', 'À définir'] }] }
];
export type Payload = {
    service: ServiceId;
    details: Record<string, string>;
    description: string;
    client: string;
    email: string;
    phone: string;
    references: string;
    deadline: string;
    budget: string;
    consent: boolean;
    files: {
        name: string;
        data: string;
    }[];
    website: string;
};
export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) { super(message); this.name = 'ApiError'; this.status = status; }
}
export async function api<T>(path: string, method = 'GET', body?: unknown, key?: string): Promise<T> { const response = await fetch('/api' + path, { method, credentials: 'same-origin', headers: { ...(method !== 'GET' ? { 'Content-Type': 'application/json', 'X-Haske-Request': '1' } : {}), ...(key ? { 'Idempotency-Key': key } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }); const data = await response.json().catch(() => ({ error: 'Le serveur ne répond pas correctement.' })); if (!response.ok)
    throw new ApiError(data.error || 'Une erreur est survenue.', response.status); return data as T; }
export const errorText = (e: unknown) => e instanceof Error ? e.message : 'Une erreur est survenue.';
