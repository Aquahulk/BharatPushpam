"use client";
import { useEffect, useState } from 'react';
import { buildCloudinaryUrl } from '@/app/lib/cloudinary';

type Service = {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceMin: number;
  imagePublicId?: string | null;
};

export default function AdminServicesManager({ initialServices }: { initialServices: Service[] }) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [edits, setEdits] = useState<Record<string, Partial<Service>>>({});
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceMin, setPriceMin] = useState<number>(0);
  const [imagePublicId, setImagePublicId] = useState('');
  const [creatingUploadFile, setCreatingUploadFile] = useState<File | null>(null);
  const [creatingUploading, setCreatingUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch('/api/admin/services');
    const data = await res.json();
    if (res.ok) setServices(data.services || []);
  }

  async function createService() {
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, priceMin, imagePublicId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      setMessage('Service created');
      setName('');
      setDescription('');
      setPriceMin(0);
      setImagePublicId('');
      refresh();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function updateService(id: string, patch: Partial<Service>) {
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      setMessage('Service updated');
      refresh();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function deleteService(id: string) {
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/services/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      setMessage('Service deleted');
      refresh();
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function uploadServiceImage(file: File): Promise<string | null> {
    try {
      const fd = new FormData();
      fd.append('image_0', file);
      fd.append('title', name || 'Service Image');
      fd.append('description', description || '');
      fd.append('type', 'OTHER');
      const res = await fetch('/api/admin/images/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const publicId = data?.images?.[0]?.publicId || null;
      const url = data?.images?.[0]?.url || null;
      // Prefer using the secure URL so client-side rendering works even if env cloud name is missing
      return url || publicId;
    } catch (e) {
      console.error('Upload service image failed', e);
      return null;
    }
  }

  return (
    <div className="space-y-6">
      <div className="border rounded p-4">
        <div className="font-semibold mb-2">Create Service</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="border rounded px-3 py-2" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Starting price (₹)" type="number" value={priceMin} onChange={e => setPriceMin(Number(e.target.value))} />
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
            <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Cloudinary public ID or full URL (e.g. services/garden-services or https://res.cloudinary.com/...)" value={imagePublicId} onChange={e => setImagePublicId(e.target.value)} />
            <div className="flex items-center gap-2">
              <input type="file" accept="image/*" onChange={e => setCreatingUploadFile(e.target.files?.[0] || null)} />
              <button
                className="px-3 py-2 border rounded text-sm bg-gray-100 hover:bg-gray-200"
                disabled={!creatingUploadFile || creatingUploading}
                onClick={async () => {
                  if (!creatingUploadFile) return;
                  setCreatingUploading(true);
                  const pid = await uploadServiceImage(creatingUploadFile);
                  if (pid) setImagePublicId(pid);
                  setCreatingUploading(false);
                }}
              >{creatingUploading ? 'Uploading…' : 'Upload'}</button>
            </div>
          </div>
          <textarea className="border rounded px-3 py-2 md:col-span-2" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <button onClick={createService} className="mt-3 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Create</button>
        {message && <div className="text-green-700 mt-2">{message}</div>}
        {error && <div className="text-red-600 mt-2">{error}</div>}
      </div>

      <div className="border rounded p-4">
        <div className="font-semibold mb-3">Existing Services</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(s => (
            <div key={s.id} className="border rounded overflow-hidden">
              <div className="aspect-[4/3] bg-gray-100">
                {// eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.imagePublicId ? buildCloudinaryUrl(s.imagePublicId, 600, 450) : `https://via.placeholder.com/600x450/10b981/ffffff?text=${encodeURIComponent(s.name.split(' ')[0])}`}
                  alt={s.name}
                  className="w-full h-full object-cover"
                />}
              </div>
              <div className="p-3 space-y-2">
                <input
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Service name"
                  value={(edits[s.id]?.name ?? s.name) as string}
                  onChange={e => setEdits(prev => ({ ...prev, [s.id]: { ...prev[s.id], name: e.target.value } }))}
                />
                <textarea
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Description"
                  value={(edits[s.id]?.description ?? s.description) as string}
                  onChange={e => setEdits(prev => ({ ...prev, [s.id]: { ...prev[s.id], description: e.target.value } }))}
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">₹</span>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    type="number"
                    placeholder="Starting price"
                    value={(edits[s.id]?.priceMin ?? s.priceMin) as number}
                    onChange={e => setEdits(prev => ({ ...prev, [s.id]: { ...prev[s.id], priceMin: Number(e.target.value) } }))}
                  />
                </div>
                <input
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Cloudinary public ID or full URL"
                  value={(edits[s.id]?.imagePublicId ?? s.imagePublicId ?? '') as string}
                  onChange={e => setEdits(prev => ({ ...prev, [s.id]: { ...prev[s.id], imagePublicId: e.target.value } }))}
                />
                <div className="flex items-center gap-2">
                  <input type="file" accept="image/*" onChange={e => {
                    const file = e.target.files?.[0] || null;
                    if (!file) return;
                    // optimistic set a marker
                    setEdits(prev => ({ ...prev, [s.id]: { ...prev[s.id], imagePublicId: (prev[s.id]?.imagePublicId ?? s.imagePublicId ?? '') } }));
                    uploadServiceImage(file).then(pid => {
                      if (pid) setEdits(prev => ({ ...prev, [s.id]: { ...prev[s.id], imagePublicId: pid } }));
                    });
                  }} />
                  <span className="text-xs text-gray-500">Upload and auto-fill</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => updateService(s.id, edits[s.id] || {})}
                    className="px-3 py-1 border rounded bg-blue-600 text-white hover:bg-blue-700"
                  >Save</button>
                  <button
                    onClick={() => setEdits(prev => ({ ...prev, [s.id]: {} }))}
                    className="px-3 py-1 border rounded hover:border-gray-600"
                  >Reset</button>
                  <button onClick={() => deleteService(s.id)} className="ml-auto px-3 py-1 border rounded text-red-700 hover:border-red-600">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}