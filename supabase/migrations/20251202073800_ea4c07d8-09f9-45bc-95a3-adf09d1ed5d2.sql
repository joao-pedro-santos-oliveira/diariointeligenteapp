-- Update journal-audio bucket to be public
update storage.buckets set public = true where id = 'journal-audio';