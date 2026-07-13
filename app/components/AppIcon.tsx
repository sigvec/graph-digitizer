import { Icons } from './icons';
import type { IconName } from './icons';

interface Props {
    name: IconName,
    size?: number,
    colour?: string
}
export default function AppIcon({
    name,
    size = 20,
    colour = '#333333',
}: Props) {

    const Icon = Icons[name];

    return (
        <Icon
            size={size}
            color={colour}
            strokeWidth={2}
        />
    );
}